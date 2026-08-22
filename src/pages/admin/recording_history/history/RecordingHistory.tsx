// File: src/pages/admin/recording/history/RecordingHistory.tsx
// Per-student recordings review: step through every clip a student has
// on file one at a time (dot navigation, same pattern as the sentence
// picker in RecordSession.tsx), with the sentence text they read,
// playback, and delete. Reached via ?student=<id>.
//
// Deliberately doesn't render AdminSubNav — this is meant to be a
// focused review screen, not another place to navigate from. The only
// way out is the explicit "Back to student" link below, which returns
// to that student's edit drawer on the roster page.
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Trash2, Loader2, FileAudio } from 'lucide-react'
import { useTheme } from '../../../../contexts/ThemeContext.tsx'
import { showConfirmation, showToast } from '../../../../helpers/swalHelpers.ts'
import { useFinetuneStudentsQuery } from '../../useFinetuneStudents.ts'
import {
    useStudentRecordingsQuery,
    useDeleteStudentRecordingMutation,
    useStudentRecordingSignedUrl,
    type StudentRecording,
} from '../../useStudentRecordings.ts'
import { useReadingSentenceSetsQuery } from '../../useReadingSentences.ts'
export default function RecordingHistory() {
    const { theme } = useTheme()
    const [searchParams] = useSearchParams()
    const studentId = searchParams.get('student') ?? ''
    const { data: studentsData } = useFinetuneStudentsQuery()
    const student = (studentsData ?? []).find((s) => s.id === studentId) ?? null
    const { data, isLoading, error } = useStudentRecordingsQuery(studentId || null)
    const recordings = data ?? []
    const deleteMutation = useDeleteStudentRecordingMutation(studentId || null)
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
    const current = recordings[index] ?? null
    // Clamp the index if the list shrinks (e.g. right after a delete) so
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
    if (!studentId) {
        return (
            <div className="mx-auto max-w-3xl px-4 pb-12 pt-6">
                <div className="rounded-2xl border border-dashed border-gray-900/15 p-8 text-center text-sm text-gray-500 dark:border-gray-100/15 dark:text-gray-400">
                    No student selected.{' '}
                    <Link to="/admin/students" className="font-semibold text-teal-600 underline dark:text-teal-400">
                        Pick one from the roster
                    </Link>
                    .
                </div>
            </div>
        )
    }
    return (
        <div className="mx-auto max-w-3xl px-4 pb-12 pt-6">
            <Link
                to={`/admin/students?edit=${studentId}`}
                className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-gray-900/10 bg-white px-4 py-1.5 text-sm font-bold text-gray-600 shadow-sm transition-colors duration-300 hover:bg-gray-900/5 dark:border-gray-100/10 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-100/10"
            >
                <ArrowLeft size={14} /> Back to student
            </Link>
            <h1 className="mb-1 text-xl font-extrabold text-gray-900 dark:text-gray-50">
                Recordings — {student?.full_name ?? '…'}
            </h1>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
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
                <div className="rounded-2xl border border-gray-900/10 bg-white p-5 dark:border-gray-100/10 dark:bg-gray-900">
                    <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Recording {index + 1} of {recordings.length}
                        </span>
                        <div className="flex flex-wrap justify-end gap-1">
                            {recordings.map((r, i) => (
                                <button
                                    key={r.id}
                                    type="button"
                                    onClick={() => setIndex(i)}
                                    className={`h-2 w-2 rounded-full ${
                                        i === index ? 'bg-orange-500' : 'bg-gray-900/15 dark:bg-gray-100/15'
                                    }`}
                                    aria-label={`Go to recording ${i + 1}`}
                                />
                            ))}
                        </div>
                    </div>
                    {current && (
                        <>
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-teal-500/15 px-2.5 py-0.5 text-xs font-semibold text-teal-600 dark:text-teal-400">
                                    {setLabel(current.sentence_set)} · sentence {current.sentence_number}
                                </span>
                                {current.duration_seconds != null && (
                                    <span className="rounded-full bg-gray-900/5 px-2.5 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-100/10 dark:text-gray-300">
                                        {Math.round(current.duration_seconds)}s
                                    </span>
                                )}
                                <span className="rounded-full bg-gray-900/5 px-2.5 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-100/10 dark:text-gray-300">
                                    {new Date(current.created_at).toLocaleString()}
                                </span>
                            </div>
                            <p className="mb-5 text-xl font-bold leading-snug text-gray-900 dark:text-gray-50">
                                {current.sentence_text}
                            </p>
                            <div className="flex flex-wrap items-center gap-3">
                                {loadingAudio ? (
                                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                        <Loader2 size={14} className="animate-spin" /> Loading audio…
                                    </div>
                                ) : audioUrl ? (
                                    <audio src={audioUrl} controls className="h-9 max-w-full" />
                                ) : (
                                    <span className="text-sm text-gray-500 dark:text-gray-400">Audio unavailable.</span>
                                )}
                                <button
                                    type="button"
                                    onClick={() => handleDelete(current)}
                                    disabled={deleteMutation.isPending && deleteMutation.variables?.id === current.id}
                                    className="flex items-center gap-1.5 rounded-full bg-red-500/15 px-3.5 py-2 text-xs font-bold text-red-700 transition-colors duration-150 hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-300 dark:hover:bg-red-500/25"
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
                                    className="flex items-center gap-1.5 rounded-full border border-gray-900/10 px-4 py-2 text-sm font-semibold text-gray-600 transition-colors duration-150 hover:bg-gray-900/5 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-100/10 dark:text-gray-300 dark:hover:bg-gray-100/10"
                                >
                                    <ArrowLeft size={14} /> Previous
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIndex((i) => Math.min(recordings.length - 1, i + 1))}
                                    disabled={index === recordings.length - 1}
                                    className="flex items-center gap-1.5 rounded-full border border-gray-900/10 px-4 py-2 text-sm font-semibold text-gray-600 transition-colors duration-150 hover:bg-gray-900/5 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-100/10 dark:text-gray-300 dark:hover:bg-gray-100/10"
                                >
                                    Next <ArrowRight size={14} />
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}