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
// -stops the instant `seconds` reaches the cap. Belt and suspenders.
//
// Sentences that already have a saved recording are tracked via
// useStudentRecordingsQuery. Navigating back to one shows the existing
// take (via a short-lived signed URL) instead of a blank "READY?" state,
// and saving over it deletes the old row/storage object first so we
// never end up with two student_recordings rows for the same
// (student_id, sentence_set, sentence_number).
//
// The signed-URL fetch effect intentionally does NOT reset state
// synchronously at the top of its body (that pattern trips
// react-hooks/set-state-in-effect, since it fires a setState on every
// dependency change even when nothing needs to change). Instead,
// existingSignedUrl is only ever set from inside the async .then(), and
// cleared from the event handlers that actually cause it to go stale
// (goToSentence, handleSave) — not from the effect itself. Loading state
// for that fetch comes straight from the mutation's own isPending rather
// than a second manually-managed boolean.
//
// Quality flagging, two tiers:
//
// 1. Whole-clip flags — right after a take is recorded, the admin can
//    tap one or more reason chips (noisy, cut off, wrong sentence,
//    other) BEFORE saving. This doesn't block the save or force a
//    retake — it still uploads the clip (so nothing recorded is
//    silently lost and there's a record of what happened), but tags the
//    row status='discarded' with notes=<picked reasons>. A clip like
//    this is unusable for anything downstream.
//
// 2. Word-level tagging — for a take that IS usable, the admin can tap
//    individual words in the sentence to cycle them
//    correct -> mispronounced -> omitted, and add any extra words the
//    student said that aren't in the reference sentence ("insertions").
//    This is what actually distinguishes the two things this recording
//    pilot feeds into the Filipino miscue-detection model
//    (basaquest-filipino-miscue-detection): a clean take with no word
//    issues is a straight (audio, reference-phonemes) fine-tuning pair
//    (status='fine_tuning'), while a take with real tagged mistakes
//    becomes labeled ground truth for evaluating the GOP scorer's
//    per-word accuracy (status='evaluation') — the tagged words are
//    what the model's own predictions get checked against, not a
//    training pair anymore (the audio no longer matches the reference
//    sentence's phonemes 1:1). Word-level tags are written to the
//    separate student_recording_word_flags table, keyed by the new
//    recording's id. A whole-clip flag always wins — no point tagging
//    individual words on a take that's being thrown out entirely, so
//    the word-tagging UI hides itself once any whole-clip chip is
//    active.
//
// A finalized ("locked") student — see 20260822090000_add_recording_lock.sql
// — bounces the admin back before rendering the recorder at all (below,
// right after the "student not found" guard). This is defense-in-depth:
// SelectStudent.tsx already disables "Start recording" for a locked
// student, but this page is also reachable directly via a bookmarked or
// shared URL, so it needs its own check too.
//
// Split across a few files to keep this one to "wire the pieces together
// and lay out two panels": the actual save sequence (upload -> replace
// old row -> insert -> word-flags -> invalidate -> reset/advance) lives
// in hooks/useSaveRecording.ts, and the two recorder-panel sub-UIs
// (whole-clip flag chips, word-level tagging) live in
// components/QualityFlagChips.tsx and components/WordTaggingPanel.tsx.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Mic, Check, RotateCcw, Loader2, ShieldAlert, ArrowLeft, TriangleAlert, Flag, Tag } from 'lucide-react'
import { useAuth } from '../../../../contexts/AuthContext'
import { useRecorder } from '../../../proficiency/pre_assessment/assessment_session/features/useRecorder'
import { Waveform } from '../../../proficiency/pre_assessment/assessment_session/features/Waveform'
import { useReadingSentencesQuery, useReadingSentenceSetsQuery } from '../../useReadingSentences'
import { useFinetuneStudentsQuery } from '../../useFinetuneStudents.ts'
import { useConsentFileCountsQuery } from '../../useConsentFiles.ts'
import { useStudentRecordingsQuery, useStudentRecordingSignedUrl } from '../../useStudentRecordings.ts'
import { useTheme } from '../../../../contexts/ThemeContext'
import { useSaveRecording } from './hooks/useSaveRecording'
import { QualityFlagChips } from './components/QualityFlagChips'
import { WordTaggingPanel } from './components/WordTaggingPanel'
// Short takes, so the near-limit color cue kicks in for the last third of
// the cap rather than assessment's proportionally tiny final ~5%.
const RECORD_MAX_SECONDS = 15
const NEAR_LIMIT_AT = RECORD_MAX_SECONDS - 5
function recordingKey(set: string, number: number) {
    return `${set}-${number}`
}
export default function RecordSession() {
    const { user } = useAuth()
    const { theme } = useTheme()
    const [searchParams] = useSearchParams()
    const studentId = searchParams.get('student') ?? ''
    // Sets are admin-editable now (see SentenceScripts.tsx) — no longer a
    // fixed 'g1_2' | 'g3_4' union, so this is just whatever key the URL
    // carries. The "does this key actually exist" check happens below,
    // once useReadingSentenceSetsQuery has loaded.
    const sentenceSet = searchParams.get('set') ?? ''
    const [sentenceIndex, setSentenceIndex] = useState(0)
    const [savedCount, setSavedCount] = useState(0)
    const { status, seconds, audioUrl, levels, isNoisy, start, stop, reset } = useRecorder()
    const { data: setsData, isLoading: loadingSentenceSets } = useReadingSentenceSetsQuery()
    const sentenceSetLabels = useMemo(() => new Map((setsData ?? []).map((s) => [s.key, s.label])), [setsData])
    const { data: sentencesData, isLoading: loadingSentences, error: sentencesQueryError } = useReadingSentencesQuery()
    const sentencesBySet = sentencesData ?? {}
    const sentencesError = sentencesQueryError instanceof Error ? sentencesQueryError.message : null
    const { data: studentsData, isLoading: loadingStudents } = useFinetuneStudentsQuery()
    const students = useMemo(() => studentsData ?? [], [studentsData])
    // consent_on_file (the DB column) stopped being settable once the
    // manual checkbox was removed from the student form — "has ≥1
    // consent file attached" is the real signal now, same as
    // SelectStudent.tsx and FinetuneStudentList.tsx.
    const { data: consentCountsData, isLoading: loadingConsentCounts } = useConsentFileCountsQuery()
    const consentCounts = consentCountsData ?? {}
    // Existing saved recordings for this student, keyed by
    // "<sentence_set>-<sentence_number>" so we can tell at a glance
    // whether the sentence currently on screen already has a take saved,
    // regardless of which sentence set it belongs to.
    const { data: recordingsData, isLoading: loadingRecordings } = useStudentRecordingsQuery(studentId || null)
    const recordings = useMemo(() => recordingsData ?? [], [recordingsData])
    const recordingsByKey = useMemo(() => {
        const map = new Map<string, (typeof recordings)[number]>()
        for (const r of recordings) {
            map.set(recordingKey(r.sentence_set, r.sentence_number), r)
        }
        return map
    }, [recordings])
    const signedUrlMutation = useStudentRecordingSignedUrl()
    const [existingSignedUrl, setExistingSignedUrl] = useState<string | null>(null)
    // Which quality-flag reasons are toggled on for the take currently
    // sitting in "recorded" state, waiting to be saved.
    const [flagReasons, setFlagReasons] = useState<string[]>([])
    // Word-level tags for the take currently sitting in "recorded" state.
    // wordFlags is keyed by index into `words` (the current sentence
    // split on whitespace); insertions are free-text extra words the
    // student said that aren't in the reference sentence at all, so they
    // have no index to key against.
    const [wordFlags, setWordFlags] = useState<Record<number, 'mispronunciation' | 'omission'>>({})
    const [insertions, setInsertions] = useState<string[]>([])
    const [insertionDraft, setInsertionDraft] = useState('')
    const sentences = sentencesBySet[sentenceSet] ?? []
    const current = sentences[sentenceIndex]
    const words = useMemo(() => (current ? current.text.split(/\s+/).filter(Boolean) : []), [current])
    const selectedStudent = useMemo(() => students.find((s) => s.id === studentId) ?? null, [students, studentId])
    const hasConsent = !!selectedStudent && (consentCounts[selectedStudent.id] ?? 0) > 0
    const isRecording = status === 'recording'
    const isRecorded = status === 'recorded'
    const nearLimit = isRecording && seconds >= NEAR_LIMIT_AT
    const existingRecording = current ? (recordingsByKey.get(recordingKey(sentenceSet, current.number)) ?? null) : null
    // Only relevant while we haven't started a fresh local take — once the
    // admin presses the mic to retake, the "already saved" playback panel
    // gets out of the way, and the normal recording flow takes over.
    const showSavedPanel = status === 'idle' && !!existingRecording
    const loadingExistingAudio = showSavedPanel && signedUrlMutation.isPending
    const hasWordLevelIssues = Object.keys(wordFlags).length > 0 || insertions.length > 0
    // eslint-disable-next-line react-hooks/preserve-manual-memoization
    const toggleFlag = useCallback((key: string) => {
        setFlagReasons((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))
    }, [])
    // Tap-to-cycle: correct -> mispronounced -> omitted -> correct.
    // eslint-disable-next-line react-hooks/preserve-manual-memoization
    const cycleWordFlag = useCallback((index: number) => {
        setWordFlags((prev) => {
            const next = { ...prev }
            const flag = next[index]
            if (!flag) {
                next[index] = 'mispronunciation'
            } else if (flag === 'mispronunciation') {
                next[index] = 'omission'
            } else {
                delete next[index]
            }
            return next
        })
    }, [])
    // eslint-disable-next-line react-hooks/preserve-manual-memoization
    const addInsertion = useCallback(() => {
        const word = insertionDraft.trim()
        if (!word) return
        setInsertions((prev) => [...prev, word])
        setInsertionDraft('')
    }, [insertionDraft])
    // eslint-disable-next-line react-hooks/preserve-manual-memoization
    const removeInsertion = useCallback((index: number) => {
        setInsertions((prev) => prev.filter((_, i) => i !== index))
    }, [])
    // Bundles the "this take is no longer current" resets shared between
    // goToSentence and a successful save (see useSaveRecording.ts) — kept
    // as one callback so both stay in sync rather than drifting apart.
    // eslint-disable-next-line react-hooks/preserve-manual-memoization
    const clearTakeState = useCallback(() => {
        setExistingSignedUrl(null)
        setFlagReasons([])
        setWordFlags({})
        setInsertions([])
        setInsertionDraft('')
    }, [])
    // eslint-disable-next-line react-hooks/preserve-manual-memoization
    const incrementSavedCount = useCallback(() => {
        setSavedCount((n) => n + 1)
    }, [])
    // Redundant hard stop — see header comment. Fires on every tick while
    // recording; harmless if useRecorder's own internal cap already beat
    // it to the punch, since stop() on an already-stopped recorder is a
    // no-op there.
    useEffect(() => {
        if (isRecording && seconds >= RECORD_MAX_SECONDS) {
            stop()
        }
    }, [isRecording, seconds, stop])
    // Fetch a short-lived signed URL for the existing saved take whenever
    // the admin lands on a sentence that already has one and hasn't
    // started a new local take. Deliberately does not clear
    // existingSignedUrl up front — see header comment — it's only ever
    // set from the resolved fetch, and cleared elsewhere.
    useEffect(() => {
        if (!existingRecording || status !== 'idle') return
        let cancelled = false
        signedUrlMutation
            .mutateAsync(existingRecording.storage_path)
            .then((url) => {
                if (!cancelled) setExistingSignedUrl(url)
            })
            .catch((err) => {
                console.error('RecordSession: failed to load saved recording', err)
            })
        return () => {
            cancelled = true
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [existingRecording?.id, status])
    const { handleSave, saving } = useSaveRecording({
        theme,
        studentId,
        sentenceSet,
        userId: user?.id,
        audioUrl,
        hasConsent,
        current,
        existingRecording,
        seconds,
        flagReasons,
        wordFlags,
        insertions,
        words,
        hasWordLevelIssues,
        sentenceIndex,
        sentencesLength: sentences.length,
        reset,
        setSentenceIndex,
        clearTakeState,
        incrementSavedCount,
    })
    // eslint-disable-next-line react-hooks/preserve-manual-memoization
    const goToSentence = useCallback(
        // eslint-disable-next-line react-hooks/preserve-manual-memoization
        (i: number) => {
            setSentenceIndex(i)
            reset()
            clearTakeState()
        },
        [reset, clearTakeState],
    )
    // eslint-disable-next-line react-hooks/preserve-manual-memoization
    const handleRetake = useCallback(() => {
        reset()
        setFlagReasons([])
        setWordFlags({})
        setInsertions([])
        setInsertionDraft('')
    }, [reset])
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
    if (loadingSentenceSets || loadingSentences || loadingStudents || loadingConsentCounts || loadingRecordings) {
        return (
            <div className="mx-auto max-w-2xl px-4 pb-12 pt-2">
                <div className="flex items-center justify-center py-20 text-sm text-gray-500 dark:text-gray-400">
                    <Loader2 size={16} className="mr-2 animate-spin" /> Loading session…
                </div>
            </div>
        )
    }
    // The URL's ?set= doesn't match any real script — e.g. it was deleted
    // on the Sentence Scripts page after this link was generated/bookmarked.
    if (!sentenceSetLabels.has(sentenceSet)) {
        return (
            <div className="mx-auto max-w-2xl px-4 pb-12 pt-2">
                <div className="rounded-2xl border border-dashed border-gray-900/15 p-8 text-center text-sm text-gray-500 dark:border-gray-100/15 dark:text-gray-400">
                    That script couldn't be found — it may have been renamed or deleted.{' '}
                    <Link to="/admin/recording" className="font-semibold text-teal-600 underline dark:text-teal-400">
                        Pick another
                    </Link>
                    .
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
                        : 'No sentences in this script yet — add some on the Sentence Scripts page.'}
                </div>
            </div>
        )
    }
    // Student id was in the URL but doesn't resolve to a real row — e.g.,
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
    // A finalized ("locked") student — bounce back rather than showing a
    // recorder for a session that can no longer be started. Defense in
    // depth alongside the RLS lock and SelectStudent's disabled "Start
    // recording" button — this page is also reachable directly via a
    // bookmarked/shared URL.
    if (selectedStudent.recording_locked) {
        return (
            <div className="mx-auto max-w-2xl px-4 pb-12 pt-2">
                <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-8 text-center text-sm font-semibold text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                    {selectedStudent.full_name}'s recordings have been finalized and are locked — no new session can be
                    started.{' '}
                    <Link to="/admin/recording" className="font-semibold text-teal-600 underline dark:text-teal-400">
                        Pick another student
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
                                {sentenceSetLabels.get(sentenceSet) ?? sentenceSet}
                            </span>
                            <span className="rounded-full bg-gray-900/5 px-3 py-1 text-sm font-bold text-gray-600 dark:bg-gray-100/10 dark:text-gray-300">
                                Sentence {sentenceIndex + 1}/{sentences.length}
                            </span>
                            {existingRecording && existingRecording.status === 'evaluation' && (
                                <span className="flex items-center gap-1 rounded-full bg-violet-500/15 px-3 py-1 text-sm font-bold text-violet-700 dark:bg-violet-400/15 dark:text-violet-300">
                                    <Tag size={13} /> Labeled
                                </span>
                            )}
                            {existingRecording && existingRecording.status !== 'discarded' && existingRecording.status !== 'evaluation' && (
                                <span className="flex items-center gap-1 rounded-full bg-teal-500/15 px-3 py-1 text-sm font-bold text-teal-700 dark:bg-teal-400/15 dark:text-teal-300">
                                    <Check size={13} /> Saved
                                </span>
                            )}
                            {existingRecording && existingRecording.status === 'discarded' && (
                                <span
                                    className="flex items-center gap-1 rounded-full bg-amber-500/15 px-3 py-1 text-sm font-bold text-amber-700 dark:bg-amber-400/15 dark:text-amber-300"
                                    title={existingRecording.notes ?? undefined}
                                >
                                    <Flag size={13} /> Flagged{existingRecording.notes ? `: ${existingRecording.notes}` : ''}
                                </span>
                            )}
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
                                    {sentences.map((s, i) => {
                                        const savedRecording = recordingsByKey.get(recordingKey(sentenceSet, s.number))
                                        const hasSavedTake = !!savedRecording
                                        const isFlaggedTake = savedRecording?.status === 'discarded'
                                        const isLabeledTake = savedRecording?.status === 'evaluation'
                                        const isCurrent = i === sentenceIndex
                                        return (
                                            <button
                                                key={s.number}
                                                onClick={() => goToSentence(i)}
                                                aria-label={
                                                    hasSavedTake ? `Go to sentence ${i + 1} (already saved)` : `Go to sentence ${i + 1}`
                                                }
                                                title={
                                                    hasSavedTake
                                                        ? isFlaggedTake
                                                            ? 'Recording flagged'
                                                            : isLabeledTake
                                                                ? 'Recording labeled (evaluation data)'
                                                                : 'Recording already saved'
                                                        : undefined
                                                }
                                                className={`h-2.5 cursor-pointer rounded-full transition-all duration-200 ${
                                                    isCurrent
                                                        ? 'w-7 bg-teal-500'
                                                        : isFlaggedTake
                                                            ? 'w-2.5 bg-amber-400 ring-2 ring-amber-200 dark:bg-amber-500 dark:ring-amber-800'
                                                            : isLabeledTake
                                                                ? 'w-2.5 bg-violet-400 ring-2 ring-violet-200 dark:bg-violet-500 dark:ring-violet-800'
                                                                : hasSavedTake
                                                                    ? 'w-2.5 bg-teal-400 ring-2 ring-teal-200 dark:bg-teal-500 dark:ring-teal-800'
                                                                    : 'w-2.5 bg-gray-900/15 dark:bg-gray-100/15'
                                                }`}
                                            />
                                        )
                                    })}
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
                    exists. When the sentence already has a saved recording
                    and no new local take has started yet, an extra panel up
                    top plays the existing take back and makes clear that
                    pressing the mic again will retake (and replace) it. Once
                    a fresh take is recorded, a row of quality-flag chips
                    lets the admin mark it as unusable-for-training before
                    saving, and — if no whole-clip flag is active — a
                    tap-to-cycle word list lets them tag real mistakes
                    instead. See header comment. */}
                    <section className="flex h-full flex-col items-center justify-center gap-6 overflow-y-auto rounded-3xl border border-gray-900/5 bg-white p-8 shadow-sm dark:border-gray-100/10 dark:bg-gray-900 sm:p-10">
                        <div className="text-center">
                            <div className="text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                {isRecording
                                    ? 'RECORDING…'
                                    : isRecorded
                                        ? 'RECORDED — LISTEN BACK'
                                        : showSavedPanel
                                            ? 'SAVED — LISTEN OR RETAKE'
                                            : 'READY?'}
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
                            {!isRecording && !isRecorded && !showSavedPanel && (
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
                        {showSavedPanel && (
                            <div className="w-full rounded-2xl border border-teal-500/20 bg-teal-500/5 p-4 dark:border-teal-400/20 dark:bg-teal-400/5">
                                <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-teal-700 dark:text-teal-300">
                                    <Check size={15} /> A recording is already saved for this sentence.
                                </p>
                                {loadingExistingAudio ? (
                                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                        <Loader2 size={14} className="animate-spin" /> Loading saved recording…
                                    </div>
                                ) : existingSignedUrl ? (
                                    <audio controls src={existingSignedUrl} className="w-full" />
                                ) : (
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Couldn't load the saved recording.</p>
                                )}
                            </div>
                        )}
                        {!showSavedPanel && <Waveform active={isRecording} levels={levels} />}
                        {isRecorded && audioUrl && <audio controls src={audioUrl} className="w-full" />}
                        {isRecorded && <QualityFlagChips flagReasons={flagReasons} onToggle={toggleFlag} />}
                        {isRecorded && flagReasons.length === 0 && words.length > 0 && (
                            <WordTaggingPanel
                                words={words}
                                wordFlags={wordFlags}
                                onCycleWord={cycleWordFlag}
                                insertions={insertions}
                                onRemoveInsertion={removeInsertion}
                                insertionDraft={insertionDraft}
                                onInsertionDraftChange={setInsertionDraft}
                                onAddInsertion={addInsertion}
                            />
                        )}
                        {!isRecorded && (
                            <button
                                onClick={isRecording ? stop : () => start(RECORD_MAX_SECONDS)}
                                disabled={!hasConsent}
                                aria-label={isRecording ? 'Stop recording' : showSavedPanel ? 'Retake recording' : 'Start recording'}
                                className={`flex h-36 w-36 cursor-pointer items-center justify-center rounded-full text-white transition-transform duration-100 active:translate-y-1 disabled:cursor-not-allowed disabled:opacity-40 ${
                                    isRecording
                                        ? 'bg-rose-600 shadow-[0_10px_0_0_#9f1239] active:shadow-[0_3px_0_0_#9f1239]'
                                        : 'bg-teal-500 shadow-[0_10px_0_0_#0f766e] active:shadow-[0_3px_0_0_#0f766e] dark:bg-teal-600 dark:shadow-[0_10px_0_0_#115e59]'
                                }`}
                            >
                                {isRecording ? (
                                    <span className="h-10 w-10 rounded-xl bg-white" />
                                ) : showSavedPanel ? (
                                    <RotateCcw size={48} />
                                ) : (
                                    <Mic size={52} />
                                )}
                            </button>
                        )}
                        <p className="min-h-[24px] text-center text-base font-semibold text-gray-600 dark:text-gray-400">
                            {isRecording
                                ? 'Press the square when you are done.'
                                : isRecorded
                                    ? 'Listen back before saving.'
                                    : showSavedPanel
                                        ? 'Press the button to record a new take — this will replace the saved one.'
                                        : 'Press the microphone to start.'}
                        </p>
                        {isRecorded && (
                            <div className="flex w-full gap-3">
                                <button
                                    onClick={handleRetake}
                                    className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-full border-2 border-gray-900/10 px-5 py-3 text-base font-bold text-gray-700 transition-colors duration-150 hover:bg-gray-900/5 dark:border-gray-100/10 dark:text-gray-200 dark:hover:bg-gray-100/10"
                                >
                                    <RotateCcw size={17} />
                                    Retake
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving || !hasConsent}
                                    className={`flex flex-[2] cursor-pointer items-center justify-center gap-2 rounded-full px-5 py-3 text-base font-bold text-white transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 ${
                                        flagReasons.length > 0
                                            ? 'bg-amber-500 shadow-[0_4px_0_0_#b45309] active:shadow-[0_1px_0_0_#b45309] dark:bg-amber-600 dark:shadow-[0_4px_0_0_#92400e]'
                                            : hasWordLevelIssues
                                                ? 'bg-violet-500 shadow-[0_4px_0_0_#6d28d9] active:shadow-[0_1px_0_0_#6d28d9] dark:bg-violet-600 dark:shadow-[0_4px_0_0_#5b21b6]'
                                                : 'bg-teal-500 shadow-[0_4px_0_0_#0f766e] active:shadow-[0_1px_0_0_#0f766e] dark:bg-teal-600 dark:shadow-[0_4px_0_0_#115e59]'
                                    }`}
                                >
                                    {saving ? (
                                        <Loader2 size={17} className="animate-spin" />
                                    ) : flagReasons.length > 0 ? (
                                        <Flag size={17} />
                                    ) : hasWordLevelIssues ? (
                                        <Tag size={17} />
                                    ) : (
                                        <Check size={17} />
                                    )}
                                    {saving
                                        ? 'Saving…'
                                        : flagReasons.length > 0
                                            ? 'Save as flagged & next'
                                            : hasWordLevelIssues
                                                ? 'Save as labeled & next'
                                                : existingRecording
                                                    ? 'Replace & next'
                                                    : 'Save & next'}
                                </button>
                            </div>
                        )}
                    </section>
                </div>
            )}
        </div>
    )
}