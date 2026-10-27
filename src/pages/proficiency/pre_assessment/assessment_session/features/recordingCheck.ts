// File: src/pages/proficiency/pre_assessment/assessment_session/features/recordingCheck.ts
// Decides whether a finished take is worth sending for scoring. Scoring
// (Azure pronunciation assessment) is billed by the second of audio, so an
// empty or silent take should be caught on the pupil's device, before the
// upload, and the pupil asked to record again. Kept lenient on purpose: a
// slow, quiet reader must pass, and only a take with essentially no voice,
// or one far too short to hold the passage, is turned back.
export type RecordingProblem = 'silent' | 'too_short'

// Under this many seconds of voice, a take is treated as silent however long it is.
const MIN_VOICED_SECONDS = 2
// Takes this long or longer must also be at least this share voiced.
const RATIO_CHECK_FROM_SECONDS = 10
const MIN_VOICED_SHARE = 0.1
// Nobody reads faster than this, so a take shorter than words / this cannot
// contain the whole passage.
const MAX_WORDS_PER_SECOND = 5

export function findRecordingProblem(
    totalSeconds: number,
    voicedSeconds: number,
    passageWordCount: number,
): RecordingProblem | null {
    if (voicedSeconds < MIN_VOICED_SECONDS) return 'silent'
    if (totalSeconds >= RATIO_CHECK_FROM_SECONDS && voicedSeconds / totalSeconds < MIN_VOICED_SHARE) return 'silent'
    if (passageWordCount > 0 && totalSeconds < passageWordCount / MAX_WORDS_PER_SECOND) return 'too_short'
    return null
}
