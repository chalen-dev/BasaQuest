// File: src/pages/proficiency/remediation/coach/features/coachRecordingCheck.ts
//
// Whether a Reading Coach take is worth sending for scoring. Much gentler than
// the assessment's check (recordingCheck.ts), on purpose: in the Coach a pupil
// who reads only part of the page, or trips and stops, should still be scored,
// with the words they never reached shown red as omissions. So a take is only
// turned back when there is essentially no voice in it, or it is a stray tap.
export type CoachRecordingProblem = 'silent' | 'too_short'

// Less voice than this is treated as nobody speaking.
const MIN_VOICED_SECONDS = 0.5
// A take shorter than this is a stray tap, not a reading.
const MIN_TAKE_SECONDS = 1

export function findCoachRecordingProblem(totalSeconds: number, voicedSeconds: number): CoachRecordingProblem | null {
    if (totalSeconds < MIN_TAKE_SECONDS) return 'too_short'
    if (voicedSeconds < MIN_VOICED_SECONDS) return 'silent'
    return null
}
