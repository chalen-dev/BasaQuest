// File: src/pages/admin/recording_history/RecordingHistory.tsx
// Per-student recordings review: step through every clip a student has
// on file, with the sentence text they read, playback, and delete.
// Reached via ?student=<id>.
//
// LOCKING IS PER-RECORDING, NOT PER-STUDENT: an admin can explicitly
// lock/unlock a single recording (see 20260905041659_move_recording_lock_to_per_recording.sql).
// A locked recording can't be deleted here, and can't be re-recorded
// over in RecordSession.tsx, until it's explicitly unlocked again — but
// every OTHER recording for this student, and the student's own row,
// are completely unaffected. There is no more student-level "finalize"
// concept at all.
//
// Deliberately doesn't render AdminSubNav — this is meant to be a
// focused review screen, not another place to navigate from. The only
// way out is the explicit "Back to student" link below, which returns
// to that student's edit drawer on the roster page.
//
// UNIFIED PANEL: this screen sits inside ProtectedLayout, which renders
// the scenic night-sky/hillside backdrop (PersistentBackdropLayout, see
// App.tsx) behind every route in this group. The back/download-all row,
// the title, and the recording card all live inside one translucent,
// blurred panel instead of floating loose over that busy background,
// same treatment used on the remediation session screen. The recording
// card itself keeps its own solid white/gray-900 background nested
// inside that panel so the sentence text still pops.
//
// RECORDINGS SIDEBAR: same pattern as the "WORD LIST" sidebar on
// RemediationSession.tsx — a fixed left-hand panel listing every
// recording so an admin can jump straight to one instead of only
// stepping through Prev/Next. Deliberately `position: fixed` rather
// than living in the normal flex flow, so it stays put on the left at
// every screen width. `top-28 lg:top-20` matches ProtectedLayout's own
// header height (`pt-28 lg:pt-20` on its <main>) rather than the
// remediation layout's own stripped header, since this page lives
// under the regular admin chrome, not a session-only layout. Only
// rendered once there's an actual list to show (skipped during
// loading/error/empty), same as the word list is only shown on the
// main flashcard view there. Any row whose recording is locked gets a
// small lock icon next to it.
//
// GROUPED BY SENTENCE SET: recordings are already fetched ordered by
// sentence_set then sentence_number (see useStudentRecordingsQuery), so
// grouping them here is just a first-appearance bucket, not a resort —
// each group gets a small header (set label + count badge) and a
// divider line above its rows, similar to how RemediationSession.tsx's
// word list groups by error type but flatter (this is one straight list
// with dividers, not colored/segmented rows). The original flat
// `index`/`setIndex` navigation (Prev/Next, sidebar row clicks) is
// unchanged underneath — grouping only affects how the sidebar renders,
// every row still carries its real flat index into `recordings`.
//
// DOWNLOAD ALL: a second entry point next to the single-recording
// Download button (which only ever grabs the one currently open) — this
// one bundles multiple recordings into a single .zip via the `jszip`
// package (npm install jszip), since browsers have no built-in way to
// save several files as one archive. Offered as a small popover with
// two scopes: every recording on file for this student, or just the
// ones sharing the currently-viewed recording's sentence_set/script.
// Each signed URL is fetched fresh (they're short-lived, 5 minutes —
// see useStudentRecordingSignedUrl) right before zipping rather than
// reusing whatever's cached in `audioUrl`, since that only ever holds
// the one recording currently in view.
//
// CONTENT OFFSET: the content area to the right of the fixed sidebar
// (CONTENT_OFFSET_CLASS) is centered *within that region* via its own
// inner max-w-5xl wrapper, not within the whole viewport — otherwise
// it'd sit visibly off-center, shifted right by the sidebar's width.
// Widened from max-w-3xl to max-w-5xl to make use of the open space
// next to the sidebar, but padding/margins throughout the card are
// deliberately kept close to the original tighter values (not scaled
// up to match the width) — the goal is a wider single screen, not a
// taller one that needs scrolling.
//
// PLAYBACK: uses the shared AudioPlayer (components/ui/AudioPlayer.tsx)
// instead of a bare native <audio controls> — same custom play/pause +
// scrub bar already used in RecorderPanel.tsx's listen-back and
// PassageCard.tsx's teacher review, so this screen's playback looks and
// behaves consistently with the rest of the app rather than falling
// back to the browser's own (small, inconsistent-across-browsers)
// control.
//
// CURSOR: Tailwind's preflight resets <button> to cursor: default, so
// every clickable element here (including the "Back to student" link)
// gets an explicit `cursor-pointer` class — otherwise none of them show
// a pointer cursor on hover despite being clickable.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import JSZip from 'jszip'
import {
    ArrowLeft,
    ArrowRight,
    Trash2,
    Download,
    ChevronDown,
    Loader2,
    FileAudio,
    Lock,
    LockOpen,
    CheckCircle2,
} from 'lucide-react'
import { useTheme } from '../../../contexts/ThemeContext'
import { showConfirmation, showToast } from '../../../helpers/swalHelpers'
import { AudioPlayer } from '../../../components/ui/AudioPlayer'
import { useFinetuneStudentsQuery } from '../_hooks/useFinetuneStudents.ts'
import {
    useStudentRecordingsQuery,
    useDeleteStudentRecordingMutation,
    useSetRecordingLockMutation,
    useStudentRecordingSignedUrl,
    type StudentRecording,
} from '../_hooks/useStudentRecordings.ts'
import { useReadingSentenceSetsQuery } from '../_hooks/useReadingSentences.ts'

const SIDEBAR_WIDTH_CLASS = 'w-80'
// Keeps the content region clear of the fixed sidebar (its width + left
// offset + a gap) regardless of screen size — deliberately not
// responsive, since the sidebar itself doesn't move either.
const CONTENT_OFFSET_CLASS = 'pl-96'

// Strips anything that isn't safe in a filename/zip-entry name, mirroring
// the existing single-file Download button's approach.
function safeNamePart(value: string) {
    return value.replace(/[^a-zA-Z0-9_-]+/g, '_')
}

function extensionFor(storagePath: string) {
    const match = storagePath.match(/\.([a-zA-Z0-9]+)$/)
    return match ? match[1] : 'mp3'
}

export default function RecordingHistory() {
    const { theme } = useTheme()
    const [searchParams] = useSearchParams()
    const studentId = searchParams.get('student') ?? ''
    const { data: studentsData } = useFinetuneStudentsQuery()
    const student = (studentsData ?? []).find((s) => s.id === studentId) ?? null
    const { data, isLoading, error } = useStudentRecordingsQuery(studentId || null)
    const recordings = data ?? []
    const deleteMutation = useDeleteStudentRecordingMutation(studentId || null)
    const lockMutation = useSetRecordingLockMutation(studentId || null)
    const signedUrlMutation = useStudentRecordingSignedUrl()
    // Sets are admin-editable now (see SentenceScripts.tsx) — labels come
    // from the DB instead of a hardcoded SENTENCE_SET_LABELS constant, so
    // this falls back to the raw key for any set that's since been
    // renamed away or deleted (the recording itself still exists — it
    // just snapshots its own sentence_text, no FK to the set).
    const { data: setsData } = useReadingSentenceSetsQuery()
    const sentenceSetLabels = useMemo(() => new Map((setsData ?? []).map((s) => [s.key, s.label])), [setsData])
    const setLabel = (set: string) => sentenceSetLabels.get(set) ?? set
    const [index, setIndex] = useState(0)
    const [audioUrl, setAudioUrl] = useState<string | null>(null)
    const [loadingAudio, setLoadingAudio] = useState(false)
    const [isDownloading, setIsDownloading] = useState(false)
    const [showDownloadPopover, setShowDownloadPopover] = useState(false)
    const [isDownloadingAll, setIsDownloadingAll] = useState(false)
    const downloadPopoverRef = useRef<HTMLDivElement>(null)
    const current = recordings[index] ?? null
    // Clamp the index if the list shrinks (e.g., right after a delete) so
    // it doesn't end up pointing past the end.
    useEffect(() => {
        if (index >= recordings.length && recordings.length > 0) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setIndex(recordings.length - 1)
        }
    }, [recordings.length, index])
    useEffect(() => {
        if (!current) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setAudioUrl(null)
            return
        }
        let cancelled = false
        setLoadingAudio(true)
        setAudioUrl(null)
        signedUrlMutation
            .mutateAsync(current.storage_path)
            .then((url) => {
                if (!cancelled) setAudioUrl(url)
            })
            .catch(() => {
                if (!cancelled) showToast('Failed to load audio.', 'error', theme === 'dark')
            })
            .finally(() => {
                if (!cancelled) setLoadingAudio(false)
            })
        return () => {
            cancelled = true
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [current?.id])
    // Close the download-all popover on an outside click, same pattern as
    // AudioPlayer.tsx's speed/volume popovers.
    useEffect(() => {
        if (!showDownloadPopover) return
        const onPointerDown = (e: PointerEvent) => {
            const target = e.target as Node
            if (downloadPopoverRef.current && !downloadPopoverRef.current.contains(target)) {
                setShowDownloadPopover(false)
            }
        }
        document.addEventListener('pointerdown', onPointerDown)
        return () => document.removeEventListener('pointerdown', onPointerDown)
    }, [showDownloadPopover])
    // Grouped-by-sentence-set view of `recordings` for the sidebar. Since
    // the query already orders by sentence_set then sentence_number, this
    // is just bucketing by first appearance, not re-sorting — every item
    // still carries its real index into the flat `recordings` array
    // (`flatIndex`) so clicking a row still calls plain setIndex(i) same
    // as before grouping existed.
    const groupedRecordings = useMemo(() => {
        const groups: { setKey: string; items: { recording: StudentRecording; flatIndex: number }[] }[] = []
        const groupIndexBySet = new Map<string, number>()
        recordings.forEach((r, flatIndex) => {
            let groupIdx = groupIndexBySet.get(r.sentence_set)
            if (groupIdx === undefined) {
                groupIdx = groups.length
                groupIndexBySet.set(r.sentence_set, groupIdx)
                groups.push({ setKey: r.sentence_set, items: [] })
            }
            groups[groupIdx].items.push({ recording: r, flatIndex })
        })
        return groups
    }, [recordings])
    const currentSetRecordings = useMemo(
        () => (current ? recordings.filter((r) => r.sentence_set === current.sentence_set) : []),
        [recordings, current],
    )
    const handleDelete = async (recording: StudentRecording) => {
        const confirmed = await showConfirmation(
            'Delete this recording?',
            `Sentence ${recording.sentence_number} (${setLabel(recording.sentence_set)}) will be permanently deleted.`,
            theme === 'dark',
            'warning',
            'Yes, delete',
        )
        if (!confirmed) return
        try {
            await deleteMutation.mutateAsync(recording)
            showToast('Deleted.', 'success', theme === 'dark', { timer: 1200 })
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Failed to delete recording.', 'error', theme === 'dark')
        }
    }
    // Fetches the signed URL's audio as a blob and triggers a real file-save
    // dialog. A plain `<a href={audioUrl} download>` doesn't reliably force
    // a download for Supabase Storage signed URLs (they're same-origin-ish
    // but the browser can still choose to navigate/play instead), so this
    // pulls the bytes down first and downloads from a local blob: URL,
    // which every browser always treats as a download.
    const handleDownload = async () => {
        if (!audioUrl || !current) return
        setIsDownloading(true)
        try {
            const res = await fetch(audioUrl)
            if (!res.ok) throw new Error(`Failed to fetch audio (${res.status})`)
            const blob = await res.blob()
            const ext = extensionFor(current.storage_path)
            const rawName = `${student?.full_name ?? 'recording'}_${setLabel(current.sentence_set)}_sentence${current.sentence_number}`
            const filename = `${safeNamePart(rawName)}.${ext}`
            const blobUrl = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = blobUrl
            link.download = filename
            document.body.appendChild(link)
            link.click()
            link.remove()
            URL.revokeObjectURL(blobUrl)
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Failed to download audio.', 'error', theme === 'dark')
        } finally {
            setIsDownloading(false)
        }
    }
    // Bundles multiple recordings into one .zip. `scope` picks which
    // recordings go in: every one on file for this student, or only the
    // ones sharing the currently-open recording's sentence_set. Signed
    // URLs are minted fresh here (5-minute TTL — see
    // useStudentRecordingSignedUrl) rather than reusing `audioUrl`, since
    // that only ever holds the single recording currently in view.
    const handleDownloadAll = async (scope: 'all' | 'current') => {
        const targets = scope === 'all' ? recordings : currentSetRecordings
        if (targets.length === 0) return
        setShowDownloadPopover(false)
        setIsDownloadingAll(true)
        try {
            const urls = await Promise.all(targets.map((r) => signedUrlMutation.mutateAsync(r.storage_path)))
            const blobs = await Promise.all(
                urls.map(async (url) => {
                    const res = await fetch(url)
                    if (!res.ok) throw new Error(`Failed to fetch audio (${res.status})`)
                    return res.blob()
                }),
            )
            const zip = new JSZip()
            targets.forEach((r, i) => {
                const ext = extensionFor(r.storage_path)
                const entryName = `${i + 1}_${safeNamePart(setLabel(r.sentence_set))}_sentence${r.sentence_number}.${ext}`
                zip.file(entryName, blobs[i])
            })
            const zipBlob = await zip.generateAsync({ type: 'blob' })
            const scopeLabel = scope === 'all' ? 'all' : safeNamePart(setLabel(targets[0].sentence_set))
            const zipFilename = `${safeNamePart(student?.full_name ?? 'recordings')}_${scopeLabel}_recordings.zip`
            const blobUrl = URL.createObjectURL(zipBlob)
            const link = document.createElement('a')
            link.href = blobUrl
            link.download = zipFilename
            document.body.appendChild(link)
            link.click()
            link.remove()
            URL.revokeObjectURL(blobUrl)
            showToast(`Downloaded ${targets.length} recording${targets.length === 1 ? '' : 's'}.`, 'success', theme === 'dark', {
                timer: 1500,
            })
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Failed to download recordings.', 'error', theme === 'dark')
        } finally {
            setIsDownloadingAll(false)
        }
    }
    // PER-RECORDING lock toggle — operates on `current`, not the student.
    // Locking blocks both deleting this one recording (see the Delete
    // button's disabled prop below) and re-recording over it (enforced in
    // RecordSession.tsx via existingRecording.locked). Every other
    // recording for this student is untouched.
    const handleToggleLock = async () => {
        if (!current) return
        const locking = !current.locked
        const confirmed = await showConfirmation(
            locking ? 'Lock this recording?' : 'Unlock this recording?',
            locking
                ? 'Once locked, this recording can\u2019t be deleted or re-recorded over by any admin \u2014 including you \u2014 until it\u2019s explicitly unlocked again. Other recordings for this student are not affected.'
                : 'This lets the recording be deleted or replaced with a new take again.',
            theme === 'dark',
            'warning',
            locking ? 'Yes, lock' : 'Yes, unlock',
        )
        if (!confirmed) return
        try {
            await lockMutation.mutateAsync({ id: current.id, locked: locking })
            showToast(locking ? 'Recording locked.' : 'Recording unlocked.', 'success', theme === 'dark', { timer: 1200 })
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Failed to update lock state.', 'error', theme === 'dark')
        }
    }
    if (!studentId) {
        return (
            <div className="mx-auto max-w-3xl px-4 pb-12 pt-6">
                <div className="rounded-2xl border border-dashed border-gray-900/15 bg-white/80 p-8 text-center text-sm text-gray-500 backdrop-blur-md dark:border-gray-100/15 dark:bg-gray-950/70 dark:text-gray-400">
                    No student selected.{' '}
                    <Link to="/admin/students" className="cursor-pointer font-semibold text-teal-600 underline dark:text-teal-400">
                        Pick one from the roster
                    </Link>
                    .
                </div>
            </div>
        )
    }
    const showSidebar = !isLoading && !error && recordings.length > 0
    return (
        <>
            {showSidebar && (
                <aside
                    className={`fixed left-4 top-28 bottom-4 z-20 flex ${SIDEBAR_WIDTH_CLASS} flex-col rounded-2xl border border-gray-900/10 bg-white/95 p-3 shadow-lg backdrop-blur-sm dark:border-gray-100/10 dark:bg-gray-950/95 lg:top-20`}
                >
                    <p className="px-2 pb-2 pt-1 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Recordings
                    </p>
                    <div className="flex flex-1 flex-col gap-2 overflow-y-auto pr-1">
                        {groupedRecordings.map((group, groupIndex) => (
                            <div key={group.setKey} className={groupIndex === 0 ? 'flex flex-col gap-2' : 'mt-2 flex flex-col gap-2'}>
                                <div className="flex items-center justify-between gap-2 px-2">
                                    <span className="truncate text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                        {setLabel(group.setKey)}
                                    </span>
                                    <span className="shrink-0 rounded-full bg-gray-900/5 px-2 py-0.5 text-[10px] font-bold text-gray-500 dark:bg-gray-100/10 dark:text-gray-400">
                                        {group.items.length}
                                    </span>
                                </div>
                                <div className="h-px bg-gray-900/10 dark:bg-gray-100/10" />
                                {group.items.map(({ recording: r, flatIndex: i }) => {
                                    const isCurrent = i === index
                                    const rowClasses = isCurrent
                                        ? 'bg-teal-500/20 text-teal-700 ring-2 ring-teal-500/40 dark:bg-teal-400/20 dark:text-teal-300 dark:ring-teal-400/40'
                                        : 'text-gray-700 hover:bg-gray-900/5 dark:text-gray-200 dark:hover:bg-gray-100/10'
                                    return (
                                        <button
                                            key={r.id}
                                            type="button"
                                            onClick={() => setIndex(i)}
                                            aria-current={isCurrent}
                                            className={`flex cursor-pointer items-start gap-2.5 rounded-xl px-3 py-3 text-left text-sm font-bold transition-colors duration-150 ${rowClasses}`}
                                        >
                                            <span className="mt-0.5 shrink-0 rounded-full bg-gray-900/5 px-2 py-0.5 text-[10px] font-bold text-gray-600 dark:bg-gray-100/10 dark:text-gray-300">
                                                #{i + 1}
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="line-clamp-2 whitespace-normal break-words">{r.sentence_text}</span>
                                                <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                                                    sentence {r.sentence_number}
                                                </span>
                                            </span>
                                            {r.locked && (
                                                <Lock size={13} className="mt-0.5 shrink-0 text-amber-500 dark:text-amber-400" />
                                            )}
                                            {isCurrent && (
                                                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-teal-700 dark:text-teal-300" />
                                            )}
                                        </button>
                                    )
                                })}
                            </div>
                        ))}
                    </div>
                </aside>
            )}
            <div className={showSidebar ? CONTENT_OFFSET_CLASS : ''}>
                <div className="mx-auto max-w-5xl px-4 pb-8 pt-6">
                    <div className="rounded-[2rem] border border-gray-900/10 bg-white/80 p-6 shadow-xl backdrop-blur-md dark:border-gray-100/10 dark:bg-gray-950/70 sm:p-8">
                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                            <Link
                                to={`/admin/students?edit=${studentId}`}
                                className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-gray-900/10 bg-white px-4 py-1.5 text-sm font-bold text-gray-600 shadow-sm transition-colors duration-300 hover:bg-gray-900/5 dark:border-gray-100/10 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-100/10"
                            >
                                <ArrowLeft size={14} /> Back to student
                            </Link>
                            {recordings.length > 0 && (
                                <div ref={downloadPopoverRef} className="relative flex shrink-0 items-center">
                                    <button
                                        type="button"
                                        onClick={() => setShowDownloadPopover((prev) => !prev)}
                                        disabled={isDownloadingAll}
                                        aria-expanded={showDownloadPopover}
                                        className="flex cursor-pointer items-center gap-1.5 rounded-full border border-gray-900/10 bg-white px-4 py-1.5 text-sm font-bold text-gray-600 shadow-sm transition-colors duration-150 hover:bg-gray-900/5 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-100/10 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-100/10"
                                    >
                                        {isDownloadingAll ? (
                                            <Loader2 size={14} className="animate-spin" />
                                        ) : (
                                            <Download size={14} />
                                        )}
                                        Download all
                                        <ChevronDown size={14} />
                                    </button>
                                    {showDownloadPopover && (
                                        <div className="absolute right-0 top-full z-10 mt-2 flex w-56 flex-col gap-0.5 rounded-xl border border-gray-900/10 bg-white p-1.5 shadow-lg dark:border-gray-100/10 dark:bg-gray-900">
                                            <button
                                                type="button"
                                                onClick={() => handleDownloadAll('all')}
                                                className="rounded-lg px-3 py-2 text-left text-sm font-semibold text-gray-700 transition-colors duration-150 hover:bg-gray-900/5 dark:text-gray-200 dark:hover:bg-gray-100/10"
                                            >
                                                All recordings ({recordings.length})
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDownloadAll('current')}
                                                disabled={currentSetRecordings.length === 0}
                                                className="rounded-lg px-3 py-2 text-left text-sm font-semibold text-gray-700 transition-colors duration-150 hover:bg-gray-900/5 disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-200 dark:hover:bg-gray-100/10"
                                            >
                                                {current ? `${setLabel(current.sentence_set)} only (${currentSetRecordings.length})` : 'This script only'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <h1 className="mb-1 text-xl font-extrabold text-gray-900 dark:text-gray-50 sm:text-2xl">
                            Recordings — {student?.full_name ?? '…'}
                        </h1>
                        <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
                            {recordings.length} recording{recordings.length === 1 ? '' : 's'} on file.
                        </p>
                        {isLoading ? (
                            <div className="flex items-center justify-center py-16 text-sm text-gray-500 dark:text-gray-400">
                                <Loader2 size={16} className="mr-2 animate-spin" /> Loading recordings…
                            </div>
                        ) : error ? (
                            <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                                Couldn't load: {error instanceof Error ? error.message : 'Something went wrong.'}
                            </div>
                        ) : recordings.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-gray-900/15 p-10 text-center text-sm text-gray-500 dark:border-gray-100/15 dark:text-gray-400">
                                <FileAudio size={20} className="mx-auto mb-2 opacity-50" />
                                No recordings yet for this student.
                            </div>
                        ) : (
                            <div className="rounded-2xl border border-gray-900/10 bg-white p-6 dark:border-gray-100/10 dark:bg-gray-900 sm:p-8">
                                <span className="mb-3 block text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    Recording {index + 1} of {recordings.length}
                                </span>
                                {current && (
                                    <>
                                        <div className="mb-3 flex flex-wrap items-center gap-2">
                                            <span className="rounded-full bg-teal-500/15 px-3 py-1 text-xs font-semibold text-teal-600 dark:text-teal-400">
                                                {setLabel(current.sentence_set)} · sentence {current.sentence_number}
                                            </span>
                                            {current.duration_seconds != null && (
                                                <span className="rounded-full bg-gray-900/5 px-3 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-100/10 dark:text-gray-300">
                                                    {Math.round(current.duration_seconds)}s
                                                </span>
                                            )}
                                            <span className="rounded-full bg-gray-900/5 px-3 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-100/10 dark:text-gray-300">
                                                {new Date(current.created_at).toLocaleString()}
                                            </span>
                                            {current.locked && (
                                                <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-700 dark:text-amber-300">
                                                    <Lock size={11} /> Locked
                                                </span>
                                            )}
                                        </div>
                                        <p className="mb-6 text-2xl font-bold leading-snug text-gray-900 dark:text-gray-50 sm:text-3xl">
                                            {current.sentence_text}
                                        </p>
                                        <div className="rounded-2xl bg-gray-900/[0.03] p-4 dark:bg-gray-100/[0.03] sm:p-5">
                                            {loadingAudio ? (
                                                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                                    <Loader2 size={14} className="animate-spin" /> Loading audio…
                                                </div>
                                            ) : audioUrl ? (
                                                <AudioPlayer src={audioUrl} className="w-full" />
                                            ) : (
                                                <span className="text-sm text-gray-500 dark:text-gray-400">Audio unavailable.</span>
                                            )}
                                        </div>
                                        <div className="mt-4 flex items-center justify-center gap-2">
                                            <button
                                                type="button"
                                                onClick={handleDownload}
                                                disabled={!audioUrl || loadingAudio || isDownloading}
                                                className="flex cursor-pointer items-center gap-1.5 rounded-full bg-gray-900/5 px-3.5 py-2 text-xs font-bold text-gray-700 transition-colors duration-150 hover:bg-gray-900/10 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-100/10 dark:text-gray-200 dark:hover:bg-gray-100/15"
                                            >
                                                {isDownloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                                                Download
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleToggleLock}
                                                disabled={lockMutation.isPending}
                                                className={`flex cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${
                                                    current.locked
                                                        ? 'bg-gray-900/5 text-gray-700 hover:bg-gray-900/10 dark:bg-gray-100/10 dark:text-gray-200 dark:hover:bg-gray-100/15'
                                                        : 'bg-amber-500/15 text-amber-700 hover:bg-amber-500/25 dark:text-amber-300 dark:hover:bg-amber-500/25'
                                                }`}
                                            >
                                                {lockMutation.isPending ? (
                                                    <Loader2 size={14} className="animate-spin" />
                                                ) : current.locked ? (
                                                    <LockOpen size={14} />
                                                ) : (
                                                    <Lock size={14} />
                                                )}
                                                {current.locked ? 'Unlock' : 'Lock'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDelete(current)}
                                                disabled={(deleteMutation.isPending && deleteMutation.variables?.id === current.id) || current.locked}
                                                className="flex cursor-pointer items-center gap-1.5 rounded-full bg-red-500/15 px-3.5 py-2 text-xs font-bold text-red-700 transition-colors duration-150 hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-300 dark:hover:bg-red-500/25"
                                            >
                                                <Trash2 size={14} />
                                                Delete
                                            </button>
                                        </div>
                                        <div className="mt-6 flex items-center justify-between">
                                            <button
                                                type="button"
                                                onClick={() => setIndex((i) => Math.max(0, i - 1))}
                                                disabled={index === 0}
                                                className="flex cursor-pointer items-center gap-2 rounded-full border border-gray-900/10 px-6 py-3 text-base font-bold text-gray-600 transition-colors duration-150 hover:bg-gray-900/5 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-100/10 dark:text-gray-300 dark:hover:bg-gray-100/10"
                                            >
                                                <ArrowLeft size={18} /> Previous
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setIndex((i) => Math.min(recordings.length - 1, i + 1))}
                                                disabled={index === recordings.length - 1}
                                                className="flex cursor-pointer items-center gap-2 rounded-full border border-gray-900/10 px-6 py-3 text-base font-bold text-gray-600 transition-colors duration-150 hover:bg-gray-900/5 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-100/10 dark:text-gray-300 dark:hover:bg-gray-100/10"
                                            >
                                                Next <ArrowRight size={18} />
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}