// File: src/pages/admin/recording/session/RecordSession.tsx
// Step 2 of the recording flow: the actual mic-capture UI. Reads which
// student + script were confirmed on SelectStudent via URL query params
// (?student=<id>&set=<set>) rather than route state, so refreshing or
// bookmarking mid-session doesn't lose the session.
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Mic, Square, Check, RotateCcw, Loader2, ShieldAlert, ArrowLeft } from 'lucide-react'
import { supabase } from '../../../../lib/supabaseClient'
import { useAuth } from '../../../../contexts/AuthContext'
import { useRecorder } from '../../../proficiency/pre_assessment/assessment_session/features/useRecorder'
import { useReadingSentencesQuery, SENTENCE_SET_LABELS, type SentenceSet } from '../useReadingSentences'
import { useFinetuneStudentsQuery } from '../../useFinetuneStudents.ts'
import { showToast } from '../../../../helpers/swalHelpers'
import { useTheme } from '../../../../contexts/ThemeContext'
import { AdminSubNav } from '../../components/AdminSubNav'
function isSentenceSet(value: string | null): value is SentenceSet {
    return value === 'g1_2' || value === 'g3_4'
}
export default function RecordSession() {
    const { user } = useAuth()
    const { theme } = useTheme()
    const [searchParams] = useSearchParams()
    const studentId = searchParams.get('student') ?? ''
    const sentenceSet: SentenceSet = isSentenceSet(searchParams.get('set')) ? (searchParams.get('set') as SentenceSet) : 'g1_2'
    const [sentenceIndex, setSentenceIndex] = useState(0)
    const [saving, setSaving] = useState(false)
    const [savedCount, setSavedCount] = useState(0)
    const { status, seconds, audioUrl, level, start, stop, reset } = useRecorder()
    const { data: sentencesData, isLoading: loadingSentences, error: sentencesQueryError } = useReadingSentencesQuery()
    const sentencesBySet = sentencesData ?? { g1_2: [], g3_4: [] }
    const sentencesError = sentencesQueryError instanceof Error ? sentencesQueryError.message : null
    const { data: studentsData, isLoading: loadingStudents } = useFinetuneStudentsQuery()
    const students = studentsData ?? []
    const sentences = sentencesBySet[sentenceSet]
    const current = sentences[sentenceIndex]
    const selectedStudent = useMemo(() => students.find((s) => s.id === studentId) ?? null, [students, studentId])
    const handleSave = async () => {
        if (!selectedStudent || !selectedStudent.consent_on_file) return // Save button is disabled in this case anyway
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
            console.error('RecordSession: save failed', err)
            showToast(err instanceof Error ? err.message : 'Failed to save the recording.', 'error', theme === 'dark')
        } finally {
            setSaving(false)
        }
    }
    // No student in the URL at all — someone landed here directly instead
    // of going through SelectStudent. Bounce them back rather than
    // rendering a recorder with nothing to record against.
    if (!studentId) {
        return (
            <div className="mx-auto max-w-2xl">
                <AdminSubNav />
                <div className="rounded-2xl border border-dashed border-gray-900/15 p-8 text-center text-sm text-gray-500 dark:border-gray-100/15 dark:text-gray-400">
                    No student selected.{' '}
                    <Link to="/admin/recording" className="font-semibold text-teal-600 underline dark:text-teal-400">
                        Go pick one
                    </Link>
                    .
                </div>
            </div>
        )
    }
    if (loadingSentences || loadingStudents) {
        return (
            <div className="mx-auto max-w-2xl">
                <AdminSubNav />
                <div className="flex items-center justify-center py-20 text-sm text-gray-500 dark:text-gray-400">
                    <Loader2 size={16} className="mr-2 animate-spin" /> Loading session…
                </div>
            </div>
        )
    }
    if (sentencesError || sentences.length === 0) {
        return (
            <div className="mx-auto max-w-2xl">
                <AdminSubNav />
                <div className="rounded-2xl border border-dashed border-red-300 p-8 text-center text-sm text-red-600 dark:border-red-800 dark:text-red-400">
                    {sentencesError
                        ? `Couldn't load the reading script: ${sentencesError}`
                        : 'No sentences found — run "npm run seed" (or "npm run db:fresh") to seed reading_sentences.'}
                </div>
            </div>
        )
    }
    // Student id was in the URL but doesn't resolve to a real row — e.g.
    // they were deleted from the roster after this link was generated.
    if (!selectedStudent) {
        return (
            <div className="mx-auto max-w-2xl">
                <AdminSubNav />
                <div className="rounded-2xl border border-dashed border-gray-900/15 p-8 text-center text-sm text-gray-500 dark:border-gray-100/15 dark:text-gray-400">
                    That student couldn't be found — they may have been removed from the roster.{' '}
                    <Link to="/admin/recording" className="font-semibold text-teal-600 underline dark:text-teal-400">
                        Pick another
                    </Link>
                    .
                </div>
            </div>
        )
    }
    return (
        <div className="mx-auto max-w-2xl">
            <AdminSubNav />
            <Link
                to="/admin/recording"
                className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50"
            >
                <ArrowLeft size={14} /> Choose a different student
            </Link>
            <h1 className="mb-1 text-xl font-extrabold text-gray-900 dark:text-gray-50">
                Recording — {selectedStudent.full_name}
            </h1>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
                Saved: {savedCount} this session · {SENTENCE_SET_LABELS[sentenceSet]}
            </p>
            {!selectedStudent.consent_on_file && (
                <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
                    <ShieldAlert size={16} className="shrink-0" />
                    No consent on file for {selectedStudent.full_name} — recording is disabled until consent is
                    confirmed on the Students page.
                </div>
            )}
            {current && (
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
                    <p className="mb-5 text-2xl font-bold leading-snug text-gray-900 dark:text-gray-50">{current.text}</p>
                    <div className="flex flex-wrap items-center gap-3">
                        {status === 'idle' && (
                            <button
                                type="button"
                                onClick={() => start(15)}
                                disabled={!selectedStudent.consent_on_file}
                                className="flex items-center gap-2 rounded-full bg-orange-500 px-5 py-2.5 text-sm font-bold text-white shadow-[0_3px_0_0_#c2410c] active:translate-y-0.5 active:shadow-[0_1px_0_0_#c2410c] disabled:opacity-40 disabled:shadow-none dark:bg-orange-600"
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
                                <div className="h-2 flex-1 min-w-[80px] rounded-full bg-gray-900/10 dark:bg-gray-100/10" aria-hidden="true">
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
                                    disabled={saving || !selectedStudent.consent_on_file}
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
        </div>
    )
}