// File: src/pages/admin/recording/RecordStudents.tsx
// Admin-only page for the child-recording pilot: pick a student, pick which
// script they're reading, record one sentence at a time, listen back, save,
// auto-advance. Reuses the exact same mic-capture hook the pupil-facing
// assessment session uses (useRecorder) rather than a second implementation
// of getUserMedia/MediaRecorder. Sentences come from the `reading_sentences`
// table (see useReadingSentences), not a hardcoded array, so re-seeding the
// script doesn't need a code change.
import { useEffect, useMemo, useState } from 'react'
import { Mic, Square, Play, Check, RotateCcw, Loader2 } from 'lucide-react'
import { supabase } from '../../../lib/supabaseClient'
import { useAuth } from '../../../contexts/AuthContext'
import { useRecorder } from '../../proficiency/pre_assessment/assessment_session/features/useRecorder'
import { useReadingSentences, SENTENCE_SET_LABELS, type SentenceSet } from './useReadingSentences'
import { showToast } from '../../../helpers/swalHelpers'
import { useTheme } from '../../../contexts/ThemeContext'

type StudentOption = {
    id: string
    username: string | null
    full_name: string | null
    grade_level: number | null
    section: string | null
}

export default function RecordStudents() {
    const { user } = useAuth()
    const { theme } = useTheme()
    const [students, setStudents] = useState<StudentOption[]>([])
    const [loadingStudents, setLoadingStudents] = useState(true)
    const [studentId, setStudentId] = useState('')
    const [sentenceSet, setSentenceSet] = useState<SentenceSet>('g1_2')
    const [sentenceIndex, setSentenceIndex] = useState(0)
    const [saving, setSaving] = useState(false)
    const [savedCount, setSavedCount] = useState(0)

    const { status, seconds, audioUrl, level, start, stop, reset } = useRecorder()
    const { sentencesBySet, loading: loadingSentences, error: sentencesError } = useReadingSentences()

    useEffect(() => {
        let cancelled = false
        supabase
            .from('profiles')
            .select('id, username, full_name, grade_level, section')
            .eq('role', 'student')
            .order('full_name', { ascending: true })
            .then(({ data, error }) => {
                if (cancelled) return
                if (error) {
                    console.error('RecordStudents: failed to load students', error)
                } else {
                    setStudents((data ?? []) as StudentOption[])
                }
                setLoadingStudents(false)
            })
        return () => {
            cancelled = true
        }
    }, [])

    const sentences = sentencesBySet[sentenceSet]
    const current = sentences[sentenceIndex]
    const selectedStudent = useMemo(
        () => students.find((s) => s.id === studentId) ?? null,
        [students, studentId],
    )

    // Changing student or sentence set restarts at sentence 1 and drops any
    // unsaved take — recording for the wrong kid/script and saving it is a
    // worse failure mode than losing an unsaved clip.
    const handleStudentChange = (id: string) => {
        setStudentId(id)
        setSentenceIndex(0)
        reset()
    }
    const handleSetChange = (set: SentenceSet) => {
        setSentenceSet(set)
        setSentenceIndex(0)
        reset()
    }

    const handleSave = async () => {
        if (!studentId) {
            showToast('Pick a student first.', 'error', theme === 'dark')
            return
        }
        if (!audioUrl || !user || !current) return
        setSaving(true)
        try {
            const blob = await fetch(audioUrl).then((r) => r.blob())
            const ext = blob.type.includes('mp4') ? 'm4a' : 'webm'
            const path = `${studentId}/${sentenceSet}-${current.number}-${Date.now()}.${ext}`

            const { error: uploadErr } = await supabase.storage
                .from('student-recordings')
                .upload(path, blob, { contentType: blob.type || 'audio/webm' })
            if (uploadErr) throw uploadErr

            const { error: insertErr } = await supabase.from('student_recordings').insert({
                student_id: studentId,
                recorded_by: user.id,
                sentence_set: sentenceSet,
                sentence_number: current.number,
                sentence_text: current.text,
                storage_path: path,
                duration_seconds: seconds,
            })
            if (insertErr) throw insertErr

            setSavedCount((n) => n + 1)
            reset()
            showToast(`Saved sentence ${current.number}.`, 'success', theme === 'dark', { timer: 1500 })
            if (sentenceIndex < sentences.length - 1) {
                setSentenceIndex((i) => i + 1)
            }
        } catch (err) {
            console.error('RecordStudents: save failed', err)
            showToast(err instanceof Error ? err.message : 'Failed to save the recording.', 'error', theme === 'dark')
        } finally {
            setSaving(false)
        }
    }

    if (loadingSentences) {
        return (
            <div className="mx-auto flex max-w-2xl items-center justify-center py-20 text-sm text-gray-500 dark:text-gray-400">
                <Loader2 size={16} className="mr-2 animate-spin" /> Loading reading script…
            </div>
        )
    }

    if (sentencesError || sentences.length === 0) {
        return (
            <div className="mx-auto max-w-2xl rounded-2xl border border-dashed border-red-300 p-8 text-center text-sm text-red-600 dark:border-red-800 dark:text-red-400">
                {sentencesError
                    ? `Couldn't load the reading script: ${sentencesError}`
                    : 'No sentences found — run "npm run seed" (or "npm run db:fresh") to seed reading_sentences.'}
            </div>
        )
    }

    return (
        <div className="mx-auto max-w-2xl">
            <h1 className="mb-1 text-xl font-extrabold text-gray-900 dark:text-gray-50">Record a student</h1>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
                Saved: {savedCount} this session. See the child recording plan for the consent/eligibility checklist —
                this page only captures and stores audio, it doesn't apply that checklist for you.
            </p>

            <div className="mb-4 grid gap-4 sm:grid-cols-2">
                <label className="block">
                    <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Student
                    </span>
                    <select
                        value={studentId}
                        onChange={(e) => handleStudentChange(e.target.value)}
                        disabled={loadingStudents}
                        className="w-full rounded-xl border border-gray-900/10 bg-white px-3 py-2.5 text-sm dark:border-gray-100/10 dark:bg-gray-900 dark:text-gray-50"
                    >
                        <option value="">{loadingStudents ? 'Loading…' : 'Select a student'}</option>
                        {students.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.full_name || s.username || s.id}
                                {s.grade_level ? ` — Grade ${s.grade_level}` : ''}
                                {s.section ? ` (${s.section})` : ''}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="block">
                    <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Script
                    </span>
                    <select
                        value={sentenceSet}
                        onChange={(e) => handleSetChange(e.target.value as SentenceSet)}
                        className="w-full rounded-xl border border-gray-900/10 bg-white px-3 py-2.5 text-sm dark:border-gray-100/10 dark:bg-gray-900 dark:text-gray-50"
                    >
                        {(Object.keys(sentencesBySet) as SentenceSet[]).map((set) => (
                            <option key={set} value={set}>
                                {SENTENCE_SET_LABELS[set]} ({sentencesBySet[set].length} sentences)
                            </option>
                        ))}
                    </select>
                </label>
            </div>

            {selectedStudent && current && (
                <div className="mb-6 rounded-2xl border border-gray-900/10 bg-white p-5 dark:border-gray-100/10 dark:bg-gray-900">
                    <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            Sentence {current.number} of {sentences.length}
                        </span>
                        <div className="flex gap-1">
                            {sentences.map((s, i) => (
                                <button
                                    key={s.number}
                                    type="button"
                                    onClick={() => {
                                        setSentenceIndex(i)
                                        reset()
                                    }}
                                    className={`h-2 w-2 rounded-full ${
                                        i === sentenceIndex ? 'bg-orange-500' : 'bg-gray-900/15 dark:bg-gray-100/15'
                                    }`}
                                    aria-label={`Go to sentence ${s.number}`}
                                />
                            ))}
                        </div>
                    </div>

                    <p className="mb-5 text-2xl font-bold leading-snug text-gray-900 dark:text-gray-50">
                        {current.text}
                    </p>

                    <div className="flex flex-wrap items-center gap-3">
                        {status === 'idle' && (
                            <button
                                type="button"
                                onClick={() => start(15)}
                                className="flex items-center gap-2 rounded-full bg-orange-500 px-5 py-2.5 text-sm font-bold text-white shadow-[0_3px_0_0_#c2410c] active:translate-y-0.5 active:shadow-[0_1px_0_0_#c2410c] dark:bg-orange-600"
                            >
                                <Mic size={16} /> Record
                            </button>
                        )}
                        {status === 'recording' && (
                            <>
                                <button
                                    type="button"
                                    onClick={stop}
                                    className="flex items-center gap-2 rounded-full bg-red-500 px-5 py-2.5 text-sm font-bold text-white shadow-[0_3px_0_0_#b91c1c] active:translate-y-0.5 active:shadow-[0_1px_0_0_#b91c1c]"
                                >
                                    <Square size={16} /> Stop ({seconds}s)
                                </button>
                                <div
                                    className="h-2 flex-1 min-w-[80px] rounded-full bg-gray-900/10 dark:bg-gray-100/10"
                                    aria-hidden="true"
                                >
                                    <div
                                        className="h-2 rounded-full bg-orange-500 transition-[width] duration-100"
                                        style={{ width: `${Math.round(level * 100)}%` }}
                                    />
                                </div>
                            </>
                        )}
                        {status === 'recorded' && audioUrl && (
                            <>
                                <audio src={audioUrl} controls className="h-9" />
                                <button
                                    type="button"
                                    onClick={reset}
                                    className="flex items-center gap-1.5 rounded-full border border-gray-900/10 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-900/5 dark:border-gray-100/10 dark:text-gray-300 dark:hover:bg-gray-100/10"
                                >
                                    <RotateCcw size={14} /> Retake
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="flex items-center gap-1.5 rounded-full bg-green-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                                >
                                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                    {saving ? 'Saving…' : 'Save & next'}
                                </button>
                            </>
                        )}
                        {status === 'unsupported' && (
                            <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                                This browser/device won't allow microphone access. Try Chrome on the recording laptop.
                            </p>
                        )}
                    </div>
                </div>
            )}

            {!selectedStudent && (
                <div className="rounded-2xl border border-dashed border-gray-900/15 p-8 text-center text-sm text-gray-500 dark:border-gray-100/15 dark:text-gray-400">
                    <Play size={20} className="mx-auto mb-2 opacity-50" />
                    Select a student above to start recording.
                </div>
            )}
        </div>
    )
}