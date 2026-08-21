// File: src/pages/admin/recording/session/RecordSession.tsx
// Step 2 of the recording flow: the actual mic-capture UI. Reads which
// student + script were confirmed on SelectStudent via URL query params
// (?student=<id>&set=<set>) rather than route state, so refreshing or
// bookmarking mid-session doesn't lose the session.
//
// Styled to match the pupil-facing AssessmentSession/RecorderPanel look
// (big circular teal mic button, mono timer, real per-bar waveform via
// the shared Waveform component). Doesn't render AdminSubNav — this is
// meant to be a focused capture screen, not another place to navigate
// from, same reasoning as RecordingHistory.tsx.
//
// The RECORD_MAX_SECONDS cap is enforced twice: once inside useRecorder's
// own start()/tick logic, and redundantly here via a useEffect that force
// -stops the instant `seconds` reaches the cap. Belt and suspenders — if
// anything about the shared hook's internal timing gets flaky across
// repeated start/stop cycles, this component still won't let a take run
// past the intended limit.
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Mic, Check, RotateCcw, Loader2, ShieldAlert, ArrowLeft, TriangleAlert } from 'lucide-react'
import { supabase } from '../../../../lib/supabaseClient'
import { useAuth } from '../../../../contexts/AuthContext'
import { useRecorder } from '../../../proficiency/pre_assessment/assessment_session/features/useRecorder'
import { Waveform } from '../../../proficiency/pre_assessment/assessment_session/features/Waveform'
import { useReadingSentencesQuery, SENTENCE_SET_LABELS, type SentenceSet } from '../useReadingSentences'
import { useFinetuneStudentsQuery } from '../../useFinetuneStudents.ts'
import { useConsentFileCountsQuery } from '../../useConsentFiles.ts'
import { showToast } from '../../../../helpers/swalHelpers'
import { useTheme } from '../../../../contexts/ThemeContext'

// Short takes, so the near-limit color cue kicks in for the last third of
// the cap rather than assessment's proportionally tiny final ~5%.
const RECORD_MAX_SECONDS = 15
const NEAR_LIMIT_AT = RECORD_MAX_SECONDS - 5

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
    const { status, seconds, audioUrl, levels, isNoisy, start, stop, reset } = useRecorder()
    const { data: sentencesData, isLoading: loadingSentences, error: sentencesQueryError } = useReadingSentencesQuery()
    const sentencesBySet = sentencesData ?? { g1_2: [], g3_4: [] }
    const sentencesError = sentencesQueryError instanceof Error ? sentencesQueryError.message : null
    const { data: studentsData, isLoading: loadingStudents } = useFinetuneStudentsQuery()
    const students = studentsData ?? []
    // consent_on_file (the DB column) stopped being settable once the
    // manual checkbox was removed from the student form — "has ≥1
    // consent file attached" is the real signal now, same as
    // SelectStudent.tsx and FinetuneStudentList.tsx.
    const { data: consentCountsData, isLoading: loadingConsentCounts } = useConsentFileCountsQuery()
    const consentCounts = consentCountsData ?? {}
    const sentences = sentencesBySet[sentenceSet]
    const current = sentences[sentenceIndex]
    const selectedStudent = useMemo(() => students.find((s) => s.id === studentId) ?? null, [students, studentId])
    const hasConsent = !!selectedStudent && (consentCounts[selectedStudent.id] ?? 0) > 0
    const isRecording = status === 'recording'
    const isRecorded = status === 'recorded'
    const nearLimit = isRecording && seconds >= NEAR_LIMIT_AT

    // Redundant hard stop — see header comment. Fires on every tick while
    // recording; harmless if useRecorder's own internal cap already beat
    // it to the punch, since stop() on an already-stopped recorder is a
    // no-op there.
    useEffect(() => {
        if (isRecording && seconds >= RECORD_MAX_SECONDS) {
            stop()
        }
    }, [isRecording, seconds, stop])

    const handleSave = async () => {
        if (!hasConsent) return // Save button is disabled in this case anyway
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

    const goToSentence = (i: number) => {
        setSentenceIndex(i)
        reset()
    }

    // No student in the URL at all — someone landed here directly instead
    // of going through SelectStudent. Bounce them back rather than
    // rendering a recorder with nothing to record against.
    if (!studentId) {
        return (
            <div className="mx-auto max-w-2xl px-4 pb-12 pt-2">
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

    if (loadingSentences || loadingStudents || loadingConsentCounts) {
        return (
            <div className="mx-auto max-w-2xl px-4 pb-12 pt-2">
                <div className="flex items-center justify-center py-20 text-sm text-gray-500 dark:text-gray-400">
                    <Loader2 size={16} className="mr-2 animate-spin" /> Loading session…
                </div>
            </div>
        )
    }

    if (sentencesError || sentences.length === 0) {
        return (
            <div className="mx-auto max-w-2xl px-4 pb-12 pt-2">
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
            <div className="mx-auto max-w-2xl px-4 pb-12 pt-2">
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

    const isFirstSentence = sentenceIndex === 0
    const isLastSentence = sentenceIndex === sentences.length - 1

    return (
        <div className="mx-auto w-full max-w-[1350px] px-6 pb-6 pt-2 sm:px-10">
            <Link
                to="/admin/recording"
                className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-gray-900/10 bg-white px-4 py-1.5 text-sm font-bold text-gray-600 shadow-sm transition-colors duration-300 hover:bg-gray-900/5 dark:border-gray-100/10 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-100/10"
            >
                <ArrowLeft size={14} /> Choose a different student
            </Link>
            {!hasConsent && (
                <div className="mb-4 flex items-center gap-2 rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
                    <ShieldAlert size={16} className="shrink-0" />
                    No consent file on record for {selectedStudent.full_name} — recording is disabled until one is
                    attached on the Students page.
                </div>
            )}
            {current && (
                <div className="grid gap-6 lg:h-[calc(100vh-14rem)] lg:grid-cols-[1.6fr_1fr]">
                    {/* Sentence panel — mirrors PassagePanel.tsx's card treatment:
                    kicker/badges row up top, big bold text in the middle, dot
                    navigation + Prev/Next at the bottom. One sentence per
                    "page" here instead of paginated passage text. */}
                    <section className="flex h-full flex-col overflow-hidden rounded-3xl border border-gray-900/5 bg-white p-8 shadow-sm dark:border-gray-100/10 dark:bg-gray-900 sm:p-10">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold uppercase tracking-wide text-teal-700 dark:text-teal-300">
                                {SENTENCE_SET_LABELS[sentenceSet]}
                            </span>
                            <span className="rounded-full bg-gray-900/5 px-3 py-1 text-sm font-bold text-gray-600 dark:bg-gray-100/10 dark:text-gray-300">
                                Sentence {sentenceIndex + 1}/{sentences.length}
                            </span>
                        </div>
                        <h2 className="mt-2 text-xl font-extrabold text-gray-900 dark:text-gray-50">
                            Recording — {selectedStudent.full_name}
                        </h2>
                        <p className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-400">
                            Saved: {savedCount} this session
                        </p>
                        <div className="flex flex-1 items-center justify-center">
                            <p className="text-center text-3xl font-bold leading-snug text-gray-900 dark:text-gray-50 sm:text-4xl">
                                {current.text}
                            </p>
                        </div>
                        <div className="mt-4 shrink-0">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => goToSentence(Math.max(0, sentenceIndex - 1))}
                                    disabled={isFirstSentence}
                                    className="cursor-pointer rounded-full border-2 border-gray-900/10 px-6 py-3 text-base font-bold text-gray-700 transition-colors duration-150 hover:bg-gray-900/5 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-100/10 dark:text-gray-200 dark:hover:bg-gray-100/10"
                                >
                                    ← Previous
                                </button>
                                <div className="flex flex-1 items-center justify-center gap-2">
                                    {sentences.map((s, i) => (
                                        <button
                                            key={s.number}
                                            onClick={() => goToSentence(i)}
                                            aria-label={`Go to sentence ${i + 1}`}
                                            className={`h-2.5 cursor-pointer rounded-full transition-all duration-200 ${
                                                i === sentenceIndex ? 'w-7 bg-teal-500' : 'w-2.5 bg-gray-900/15 dark:bg-gray-100/15'
                                            }`}
                                        />
                                    ))}
                                </div>
                                <button
                                    onClick={() => goToSentence(Math.min(sentences.length - 1, sentenceIndex + 1))}
                                    disabled={isLastSentence}
                                    className="cursor-pointer rounded-full bg-teal-500 px-6 py-3 text-base font-bold text-white transition-colors duration-150 hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-teal-600 dark:hover:bg-teal-500"
                                >
                                    Next →
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* Recorder panel — same visual language as
                    RecorderPanel.tsx: status label, mono timer (amber near the
                    cap), always-on waveform that calms down when idle, big
                    circular mic/stop toggle, then retake/save once a take
                    exists. */}
                    <section className="flex h-full flex-col items-center justify-center gap-6 rounded-3xl border border-gray-900/5 bg-white p-8 shadow-sm dark:border-gray-100/10 dark:bg-gray-900 sm:p-10">
                        <div className="text-center">
                            <div className="text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                {isRecording ? 'RECORDING…' : isRecorded ? 'RECORDED — LISTEN BACK' : 'READY?'}
                            </div>
                            <div
                                className={`font-mono text-6xl font-extrabold leading-none ${
                                    nearLimit
                                        ? 'text-amber-600 dark:text-amber-400'
                                        : isRecording
                                            ? 'text-rose-600 dark:text-rose-400'
                                            : 'text-gray-900 dark:text-gray-50'
                                }`}
                            >
                                {seconds}s
                                {isRecording && (
                                    <span className="ml-1 text-2xl font-bold text-gray-400 dark:text-gray-500">
                                        / {RECORD_MAX_SECONDS}s
                                    </span>
                                )}
                            </div>
                            {!isRecording && !isRecorded && (
                                <p className="mt-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
                                    Recording is limited to {RECORD_MAX_SECONDS} seconds.
                                </p>
                            )}
                        </div>
                        {isRecording && isNoisy && (
                            <div className="flex items-center gap-2 rounded-full bg-amber-500/15 px-4 py-1.5 text-xs font-bold text-amber-700 dark:bg-amber-400/15 dark:text-amber-300">
                                <TriangleAlert size={14} />
                                It's a bit noisy right now — try to find a quieter spot.
                            </div>
                        )}
                        <Waveform active={isRecording} levels={levels} />
                        {isRecorded && audioUrl && <audio controls src={audioUrl} className="w-full" />}
                        {!isRecorded && (
                            <button
                                onClick={isRecording ? stop : () => start(RECORD_MAX_SECONDS)}
                                disabled={!hasConsent}
                                aria-label={isRecording ? 'Stop recording' : 'Start recording'}
                                className={`flex h-36 w-36 cursor-pointer items-center justify-center rounded-full text-white transition-transform duration-100 active:translate-y-1 disabled:cursor-not-allowed disabled:opacity-40 ${
                                    isRecording
                                        ? 'bg-rose-600 shadow-[0_10px_0_0_#9f1239] active:shadow-[0_3px_0_0_#9f1239]'
                                        : 'bg-teal-500 shadow-[0_10px_0_0_#0f766e] active:shadow-[0_3px_0_0_#0f766e] dark:bg-teal-600 dark:shadow-[0_10px_0_0_#115e59]'
                                }`}
                            >
                                {isRecording ? <span className="h-10 w-10 rounded-xl bg-white" /> : <Mic size={52} />}
                            </button>
                        )}
                        <p className="min-h-[24px] text-center text-base font-semibold text-gray-600 dark:text-gray-400">
                            {isRecording ? 'Press the square when you are done.' : isRecorded ? 'Listen back before saving.' : 'Press the microphone to start.'}
                        </p>
                        {isRecorded && (
                            <div className="flex w-full gap-3">
                                <button
                                    onClick={reset}
                                    className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-full border-2 border-gray-900/10 px-5 py-3 text-base font-bold text-gray-700 transition-colors duration-150 hover:bg-gray-900/5 dark:border-gray-100/10 dark:text-gray-200 dark:hover:bg-gray-100/10"
                                >
                                    <RotateCcw size={17} />
                                    Retake
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving || !hasConsent}
                                    className="flex flex-[2] cursor-pointer items-center justify-center gap-2 rounded-full bg-teal-500 px-5 py-3 text-base font-bold text-white shadow-[0_4px_0_0_#0f766e] transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_1px_0_0_#0f766e] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-teal-600 dark:shadow-[0_4px_0_0_#115e59]"
                                >
                                    {saving ? <Loader2 size={17} className="animate-spin" /> : <Check size={17} />}
                                    {saving ? 'Saving…' : 'Save & next'}
                                </button>
                            </div>
                        )}
                    </section>
                </div>
            )}
        </div>
    )
}