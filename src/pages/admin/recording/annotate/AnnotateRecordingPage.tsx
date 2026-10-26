// File: src/pages/admin/recording/annotate/AnnotateRecordingPage.tsx
// Step 3 of the recording flow: word-level annotation of one saved take.
// RecordSessionPage saves the audio first and sends the admin here
// (?student=&set= are carried along only so "Back" and "Save & next" can
// return to the right sentence). RecordingHistory links here too with
// ?from=history, which switches the page into a plain "edit this
// recording's tags" mode: just Save / Discard changes, and both return to
// the recordings list on that same recording instead of the record screen.
//
// Modeled on the teacher's AttemptWordReview screen: tap a word to select
// it, then mark it Correct / Omission / Mispronunciation in the side card.
// A mispronunciation asks what the student ACTUALLY said (spoken_text);
// words the student added that aren't in the sentence go in the
// insertions list. Saving replaces the recording's whole tag set and
// re-derives its status (any tag -> evaluation, none -> fine_tuning) — see
// useSaveAnnotationMutation. Discarded and locked takes are read-only.
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Check, Ear, Loader2, Lock, MinusCircle, Plus, Save, TriangleAlert, X } from 'lucide-react'
import { AudioPlayer } from '../../../../components/ui/AudioPlayer'
import { useTheme } from '../../../../contexts/ThemeContext'
import { showConfirmation, showSaveOnLeaveConfirmation, showToast } from '../../../../helpers/swalHelpers'
import { useUnsavedChangesBlocker } from '../../../../hooks/useUnsavedChangesBlocker'
import { useStudentRecordingSignedUrl, type StudentRecording } from '../../_hooks/useStudentRecordings.ts'
import { useFinetuneStudentsQuery } from '../../_hooks/useFinetuneStudents.ts'
import {
    useRecordingQuery,
    useRecordingWordFlagsQuery,
    useSaveAnnotationMutation,
    type AnnotationDraft,
    type RecordingWordFlag,
    type WordAnnotation,
} from '../../_hooks/useRecordingWordFlags.ts'

type Verdict = 'correct' | 'omission' | 'mispronunciation'

// Order-independent snapshot of a draft, used to tell whether anything
// changed since the page loaded (for the unsaved-changes guard).
function serializeDraft(d: AnnotationDraft): string {
    const words = Object.keys(d.words)
        .map(Number)
        .sort((a, b) => a - b)
        .map((i) => [i, d.words[i]])
    return JSON.stringify({ words, insertions: d.insertions })
}

function draftFromFlags(flags: RecordingWordFlag[]): AnnotationDraft {
    const draft: AnnotationDraft = { words: {}, insertions: [] }
    for (const f of flags) {
        if (f.error_type === 'insertion') {
            if (f.notes) draft.insertions.push(f.notes)
        } else if (f.error_type === 'omission') {
            draft.words[f.word_index] = { type: 'omission' }
        } else {
            draft.words[f.word_index] = { type: 'mispronunciation', spokenText: f.spoken_text ?? '' }
        }
    }
    return draft
}

export default function AnnotateRecordingPage() {
    const { recordingId } = useParams<{ recordingId: string }>()
    const recordingQuery = useRecordingQuery(recordingId)
    const flagsQuery = useRecordingWordFlagsQuery(recordingId)

    if (recordingQuery.isLoading || flagsQuery.isLoading) {
        return (
            <div className="flex items-center justify-center gap-2 py-24 text-gray-500 dark:text-gray-400">
                <Loader2 size={18} className="animate-spin" /> Loading recording…
            </div>
        )
    }
    if (recordingQuery.error || !recordingQuery.data) {
        return <p className="py-24 text-center text-gray-600 dark:text-gray-300">Couldn't load that recording.</p>
    }
    return (
        <AnnotateEditor
            key={recordingQuery.data.id}
            recording={recordingQuery.data}
            initialDraft={draftFromFlags(flagsQuery.data ?? [])}
        />
    )
}

function AnnotateEditor({ recording, initialDraft }: { recording: StudentRecording; initialDraft: AnnotationDraft }) {
    const navigate = useNavigate()
    const { theme } = useTheme()
    const [searchParams] = useSearchParams()
    const isDark = theme === 'dark'

    const words = useMemo(() => recording.sentence_text.split(/\s+/).filter(Boolean), [recording.sentence_text])
    const [draft, setDraft] = useState<AnnotationDraft>(initialDraft)
    // Word indexes currently open in the side panel, most recently tapped
    // first (same "stack" idea as the teacher review screen). Tapping a
    // word toggles it; the panel edits each one independently.
    const [selected, setSelected] = useState<number[]>([])
    const [insertionDraft, setInsertionDraft] = useState('')
    const [audioUrl, setAudioUrl] = useState<string | null>(null)

    const signedUrl = useStudentRecordingSignedUrl()
    useEffect(() => {
        let cancelled = false
        signedUrl
            .mutateAsync(recording.storage_path)
            .then((url) => {
                if (!cancelled) setAudioUrl(url)
            })
            .catch((err) => console.error('AnnotateRecording: failed to load audio', err))
        return () => {
            cancelled = true
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [recording.storage_path])

    const { data: students } = useFinetuneStudentsQuery()
    const studentName = students?.find((s) => s.id === recording.student_id)?.full_name

    const saveMutation = useSaveAnnotationMutation(recording, words)
    const readOnly = recording.locked || recording.status === 'discarded'

    // Unsaved-changes guard — see useUnsavedChangesBlocker. Saving sets
    // leaveTo, which both clears the guard and (via the effect below)
    // performs the navigation on the NEXT render, so the blocker is
    // already disarmed when navigate() runs.
    const [baseline] = useState(() => serializeDraft(initialDraft))
    const [leaveTo, setLeaveTo] = useState<string | null>(null)
    const isDirty = !readOnly && serializeDraft(draft) !== baseline
    useUnsavedChangesBlocker({
        hasUnsavedChanges: isDirty && leaveTo === null,
        onSaveDraft: async () => {
            await saveMutation.mutateAsync(draft)
        },
        confirmLeave: () =>
            showSaveOnLeaveConfirmation(
                'Save your annotations?',
                "You've tagged words on this recording that aren't saved yet.",
                isDark,
                { saveButtonText: 'Save & leave', discardButtonText: 'Discard', cancelButtonText: 'Keep editing' },
            ),
    })
    useEffect(() => {
        if (leaveTo) navigate(leaveTo)
    }, [leaveTo, navigate])

    // Where "Back" / "Save & next" return to: the session screen for this
    // student + script, reopened on the sentence after this one (or this
    // one for Back). Falls back to the picker if the params were lost.
    const student = searchParams.get('student') ?? recording.student_id
    const set = searchParams.get('set') ?? recording.sentence_set
    const sessionUrl = (n: number) =>
        `/admin/recording/session?student=${encodeURIComponent(student)}&set=${encodeURIComponent(set)}&n=${n}`
    const fromHistory = searchParams.get('from') === 'history'
    const historyUrl = `/admin/recording/history?student=${encodeURIComponent(student)}&recording=${recording.id}`

    const verdictOf = (i: number): Verdict => draft.words[i]?.type ?? 'correct'

    const setVerdict = (i: number, verdict: Verdict) => {
        setDraft((prev) => {
            const next = { ...prev.words }
            if (verdict === 'correct') delete next[i]
            else if (verdict === 'omission') next[i] = { type: 'omission' }
            else {
                const existing = next[i]
                next[i] = { type: 'mispronunciation', spokenText: existing?.type === 'mispronunciation' ? existing.spokenText : '' }
            }
            return { ...prev, words: next }
        })
    }
    const setSpoken = (i: number, text: string) =>
        setDraft((prev) => ({ ...prev, words: { ...prev.words, [i]: { type: 'mispronunciation', spokenText: text } as WordAnnotation } }))

    const addInsertion = () => {
        const w = insertionDraft.trim()
        if (!w) return
        setDraft((prev) => ({ ...prev, insertions: [...prev.insertions, w] }))
        setInsertionDraft('')
    }
    const removeInsertion = (i: number) =>
        setDraft((prev) => ({ ...prev, insertions: prev.insertions.filter((_, idx) => idx !== i) }))

    const flaggedCount = Object.keys(draft.words).length + draft.insertions.length

    const handleSave = async (thenNext: boolean) => {
        try {
            const status = await saveMutation.mutateAsync(draft)
            showToast(
                status === 'evaluation' ? 'Saved as labeled evaluation data.' : 'Saved — no mistakes tagged (fine-tuning data).',
                'success',
                isDark,
                { timer: 1500 },
            )
            setLeaveTo(
                fromHistory
                    ? historyUrl
                    : thenNext
                        ? sessionUrl(recording.sentence_number + 1)
                        : sessionUrl(recording.sentence_number),
            )
        } catch (err) {
            console.error('AnnotateRecording: save failed', err)
            showToast(err instanceof Error ? err.message : 'Failed to save annotations.', 'error', isDark)
        }
    }

    const handleDiscardChanges = async () => {
        if (isDirty) {
            const confirmed = await showConfirmation(
                'Discard your changes?',
                "The annotations you changed on this recording won't be saved.",
                isDark,
                'warning',
                'Yes, discard',
            )
            if (!confirmed) return
        }
        setLeaveTo(historyUrl)
    }

    const verdictChip = (i: number) => {
        const v = verdictOf(i)
        const isSel = selected.includes(i)
        const base =
            'relative cursor-pointer rounded-2xl border-2 px-4 py-2 text-xl font-bold transition-colors duration-150 lg:px-5 lg:py-2.5 lg:text-2xl'
        const color =
            v === 'omission'
                ? 'border-rose-500 bg-rose-500/20 text-rose-700 dark:border-rose-400 dark:text-rose-300'
                : v === 'mispronunciation'
                    ? 'border-orange-500 bg-orange-500/20 text-orange-700 dark:border-orange-400 dark:text-orange-300'
                    : 'border-emerald-500/40 bg-emerald-500/15 text-emerald-800 hover:bg-emerald-500/25 dark:text-emerald-300'
        return `${base} ${color} ${isSel ? 'ring-2 ring-sky-400 ring-offset-2 ring-offset-transparent' : ''}`
    }

    const toggleSelected = (i: number) =>
        setSelected((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [i, ...prev]))

    return (
        <div className="mx-auto flex h-[calc(100vh-6.5rem)] max-w-[1280px] flex-col">
            <Link
                to={fromHistory ? historyUrl : sessionUrl(recording.sentence_number)}
                className="mb-4 inline-flex shrink-0 items-center gap-2 self-start rounded-full border border-gray-900/10 bg-white px-4 py-1.5 text-sm font-bold text-gray-700 shadow-sm transition-colors duration-200 hover:bg-gray-900/5 dark:border-gray-100/10 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-100/10"
            >
                <ArrowLeft size={16} /> {fromHistory ? 'Back to recordings' : 'Back to recording'}
            </Link>
            <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto lg:grid-cols-[1.5fr_1fr] lg:grid-rows-[minmax(0,1fr)] lg:overflow-visible">
                <section className="flex flex-col rounded-3xl border border-gray-900/10 bg-white/90 p-5 shadow-sm lg:min-h-0 lg:p-6 dark:border-gray-100/10 dark:bg-gray-900/85">
                    <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                        <span className="mr-2 text-xs font-extrabold uppercase tracking-wide text-teal-600 dark:text-teal-300">Annotate</span>
                        {studentName ?? 'Student'} — sentence {recording.sentence_number}
                    </p>
                    <div className="mt-3 rounded-2xl bg-gray-900/[0.03] p-4 dark:bg-gray-100/[0.03]">
                        {audioUrl ? (
                            <AudioPlayer src={audioUrl} className="w-full" />
                        ) : (
                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                <Loader2 size={14} className="animate-spin" /> Loading audio…
                            </div>
                        )}
                    </div>
                    {readOnly && (
                        <p className="mt-3 flex items-center gap-2 rounded-xl bg-amber-500/15 px-3 py-2 text-sm font-bold text-amber-700 dark:text-amber-300">
                            {recording.locked ? <Lock size={15} /> : <TriangleAlert size={15} />}
                            {recording.locked
                                ? 'This recording is locked — unlock it in Recording History to edit its tags.'
                                : 'This take was discarded (flagged), so it can’t be word-annotated.'}
                        </p>
                    )}
                    <div className="mt-5 flex flex-wrap gap-4 text-xs font-semibold lg:text-sm text-gray-600 dark:text-gray-300">
                        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-emerald-500" /> Correct</span>
                        <span className="flex items-center gap-1"><MinusCircle size={13} className="text-rose-500" /> Omission</span>
                        <span className="flex items-center gap-1"><Ear size={13} className="text-orange-500" /> Mispronunciation</span>
                    </div>
                    <p className="mt-5 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400 lg:text-sm">
                        Tap a word to mark what happened
                    </p>
                    <div className="[scrollbar-color:var(--color-teal-500)_transparent] [scrollbar-width:thin] mt-3 flex flex-wrap content-start gap-3 p-1 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
                        {words.map((word, i) => (
                            <button
                                key={i}
                                type="button"
                                disabled={readOnly}
                                onClick={() => toggleSelected(i)}
                                aria-label={`Word "${word}": ${verdictOf(i)}`}
                                className={`${verdictChip(i)} disabled:cursor-not-allowed disabled:opacity-70`}
                            >
                                {word}
                                {verdictOf(i) === 'omission' && <MinusCircle size={14} className="absolute -right-1.5 -top-1.5 rounded-full bg-white text-rose-500 dark:bg-gray-900" />}
                                {verdictOf(i) === 'mispronunciation' && <Ear size={14} className="absolute -right-1.5 -top-1.5 rounded-full bg-white text-orange-500 dark:bg-gray-900" />}
                            </button>
                        ))}
                    </div>
                </section>

                <section className="flex flex-col gap-4 lg:min-h-0">
                    <div className="flex flex-col rounded-3xl border border-gray-900/10 bg-white/90 p-5 shadow-sm min-h-[220px] lg:min-h-0 lg:flex-1 dark:border-gray-100/10 dark:bg-gray-900/85">
                        <div className="mb-3 flex items-center justify-between">
                            <p className="text-xs font-extrabold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                Selected words{selected.length > 0 ? ` (${selected.length})` : ''}
                            </p>
                            {selected.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setSelected([])}
                                    className="cursor-pointer rounded-full px-3 py-1 text-xs font-bold text-gray-500 hover:bg-gray-900/5 dark:text-gray-400 dark:hover:bg-gray-100/10"
                                >
                                    Clear all
                                </button>
                            )}
                        </div>
                        {selected.length === 0 ? (
                            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-gray-900/10 px-4 py-6 text-center dark:border-gray-100/10">
                                <div>
                                    <p className="text-base font-extrabold text-gray-700 dark:text-gray-200">No words selected yet</p>
                                    <p className="max-w-xs text-sm font-medium text-gray-500 dark:text-gray-400">
                                        Words you tap in the sentence will stack here, most recent on top.
                                    </p>
                                </div>
                                {/* Same hint screenshot + crop as the teacher review
                                screen's SelectedWordsCard empty state. */}
                                <div
                                    aria-hidden="true"
                                    className="h-40 w-full max-w-xs overflow-hidden rounded-xl border border-gray-900/10 shadow-sm dark:border-gray-100/10"
                                    style={{
                                        backgroundImage: 'url(/hints/select_word_card_hint.png)',
                                        backgroundSize: '190%',
                                        backgroundPosition: '48% 55%',
                                        backgroundRepeat: 'no-repeat',
                                    }}
                                />
                            </div>
                        ) : (
                            <div className="flex max-h-[360px] min-h-0 flex-1 flex-col gap-3 lg:max-h-none overflow-y-auto pr-2 [scrollbar-color:var(--color-teal-500)_transparent] [scrollbar-width:thin]">
                                {selected.map((idx) => {
                                    const ann = draft.words[idx]
                                    return (
                                        <div key={idx} className="rounded-2xl border-2 border-sky-400/60 p-4">
                                            <div className="mb-3 flex items-center justify-between">
                                                <span className="text-xl font-extrabold text-gray-900 dark:text-gray-50 lg:text-2xl">{words[idx]}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleSelected(idx)}
                                                    aria-label={`Deselect ${words[idx]}`}
                                                    className="cursor-pointer text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                                                >
                                                    <X size={18} />
                                                </button>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {(['correct', 'omission', 'mispronunciation'] as const).map((v) => {
                                                    const active = verdictOf(idx) === v
                                                    const activeColor =
                                                        v === 'correct' ? 'bg-emerald-500 text-white' : v === 'omission' ? 'bg-rose-500 text-white' : 'bg-orange-500 text-white'
                                                    return (
                                                        <button
                                                            key={v}
                                                            type="button"
                                                            disabled={readOnly}
                                                            onClick={() => setVerdict(idx, v)}
                                                            className={`flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60 ${
                                                                active ? activeColor : 'bg-gray-900/5 text-gray-700 hover:bg-gray-900/10 dark:bg-gray-100/10 dark:text-gray-200'
                                                            }`}
                                                        >
                                                            {v === 'correct' ? <Check size={14} /> : v === 'omission' ? <MinusCircle size={14} /> : <Ear size={14} />}
                                                            {v === 'correct' ? 'Correct' : v === 'omission' ? 'Omission' : 'Mispronunciation'}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                            {ann?.type === 'mispronunciation' && (
                                                <label className="mt-4 block">
                                                    <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                                        What was actually said?
                                                    </span>
                                                    <input
                                                        type="text"
                                                        value={ann.spokenText}
                                                        maxLength={40}
                                                        disabled={readOnly}
                                                        onChange={(e) => setSpoken(idx, e.target.value)}
                                                        placeholder={`e.g. how they pronounced “${words[idx]}”`}
                                                        className="w-full rounded-xl border-2 border-gray-900/10 bg-transparent px-3 py-2 text-base font-semibold text-gray-900 outline-none focus:border-orange-400 dark:border-gray-100/10 dark:text-gray-50"
                                                    />
                                                </label>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    <div className="shrink-0 rounded-3xl border border-gray-900/10 bg-white/90 p-5 shadow-sm dark:border-gray-100/10 dark:bg-gray-900/85">
                        <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Extra words said (insertions)
                        </p>
                        {draft.insertions.length > 0 && (
                            <div className="mb-3 flex max-h-24 flex-wrap gap-2 overflow-y-auto">
                            {draft.insertions.map((w, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    disabled={readOnly}
                                    onClick={() => removeInsertion(i)}
                                    aria-label={`Remove inserted word ${w}`}
                                    title={w}
                                    className="flex min-w-0 max-w-full cursor-pointer items-center gap-1 rounded-full border-2 border-dashed border-amber-500 bg-amber-500/15 px-3 py-1 text-sm font-bold text-amber-700 dark:text-amber-300"
                                >
                                    <span className="truncate">{w}</span> <X size={12} className="shrink-0" />
                                </button>
                            ))}
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            <input
                                maxLength={30}
                                type="text"
                                value={insertionDraft}
                                disabled={readOnly}
                                onChange={(e) => setInsertionDraft(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault()
                                        addInsertion()
                                    }
                                }}
                                placeholder="Extra word said…"
                                className="min-w-0 flex-1 rounded-full border-2 border-gray-900/10 bg-transparent px-3 py-1 text-sm font-semibold text-gray-900 outline-none focus:border-amber-400 dark:border-gray-100/10 dark:text-gray-50"
                            />
                            <button
                                type="button"
                                disabled={readOnly || !insertionDraft.trim()}
                                onClick={addInsertion}
                                className="flex cursor-pointer items-center gap-1 rounded-full bg-gray-900/5 px-3 py-1 text-sm font-bold text-gray-700 hover:bg-gray-900/10 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-100/10 dark:text-gray-200"
                            >
                                <Plus size={14} /> Add
                            </button>
                        </div>
                    </div>

                    <div className="shrink-0 rounded-3xl border border-gray-900/10 bg-white/90 p-4 shadow-sm dark:border-gray-100/10 dark:bg-gray-900/85">
                        <p className="mb-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400">
                            {flaggedCount === 0
                                ? 'No mistakes tagged — saves as clean fine-tuning data.'
                                : `${flaggedCount} tagged — saves as labeled evaluation data.`}
                        </p>
                        {fromHistory ? (
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    disabled={saveMutation.isPending}
                                    onClick={handleDiscardChanges}
                                    className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-full border-2 border-rose-500/40 px-4 py-3 text-base font-bold text-rose-600 hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-400/30 dark:text-rose-400"
                                >
                                    <X size={17} /> Discard changes
                                </button>
                                <button
                                    type="button"
                                    disabled={readOnly || saveMutation.isPending}
                                    onClick={() => handleSave(false)}
                                    className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-teal-500 px-4 py-3 text-base font-bold text-white shadow-[0_4px_0_0_#0f766e] transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_1px_0_0_#0f766e] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-teal-600"
                                >
                                    {saveMutation.isPending ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
                                    Save
                                </button>
                            </div>
                        ) : (
                        <div className="flex gap-3">
                            <button
                                type="button"
                                disabled={readOnly || saveMutation.isPending}
                                onClick={() => handleSave(false)}
                                className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-full border-2 border-gray-900/10 px-4 py-3 text-base font-bold text-gray-700 hover:bg-gray-900/5 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-100/10 dark:text-gray-200 dark:hover:bg-gray-100/10"
                            >
                                <Save size={17} /> Save
                            </button>
                            <button
                                type="button"
                                disabled={readOnly || saveMutation.isPending}
                                onClick={() => handleSave(true)}
                                className="flex flex-[1.6] cursor-pointer items-center justify-center gap-2 rounded-full bg-teal-500 px-4 py-3 text-base font-bold text-white shadow-[0_4px_0_0_#0f766e] transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_1px_0_0_#0f766e] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-teal-600"
                            >
                                {saveMutation.isPending ? <Loader2 size={17} className="animate-spin" /> : <Check size={17} />}
                                Save &amp; next sentence
                            </button>
                        </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    )
}
