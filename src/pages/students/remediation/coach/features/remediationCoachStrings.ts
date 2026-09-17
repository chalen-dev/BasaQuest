// File: src/pages/students/remediation/coach/features/remediationCoachStrings.ts
// Bilingual strings for Reading Coach Mode — the coach-framed successor
// to the old "remediation mic-game" (game/features/remediationGameStrings.ts,
// now deleted). Same per-Lang Record shape as the rest of the app.
//
// COACH TIPS (this pass): the owl's speech-bubble line is either the
// per-word Gemini-generated coachTip (see remediation/hooks.ts's
// RemediationWordEntry.coachTip and AttemptResults.tsx's
// attachSentences()) — shown only in the 'idle' state, since it's a
// reading tip specific to that word — or, for every other coach state
// (recording/scoring/pass/fail), a line picked from the STATIC_COACH_TIPS
// pool below. 'idle' also falls back to this pool when a word has no
// coachTip (older material, or Gemini failed for that word during
// generation). Selection is deterministic (by word index, like
// treasureIcons.ts used to be), not randomized, so a re-render of the
// same word always shows the same static line.
import type { Lang } from '../../../../../components/buttons/LangToggle.tsx'
// A sentence takes longer to read than a bare word — same reasoning as
// the old MAX_WORD_RECORDING_SECONDS (8s) being bumped up here — still
// well under Azure's single-shot 30s cap (assessSingleWord in the
// scoring service), just enough headroom that a normal-paced read of a
// short sentence isn't cut off mid-way.
export const MAX_SENTENCE_RECORDING_SECONDS = 12
export function formatSeconds(totalSeconds: number): string {
    const m = Math.floor(totalSeconds / 60)
    const s = totalSeconds % 60
    return `${m}:${String(s).padStart(2, '0')}`
}
export type CoachState = 'idle' | 'recording' | 'scoring' | 'pass' | 'fail'
export type RemediationCoachStrings = (typeof STRINGS)['en']
export const STRINGS: Record<Lang, {
    back: string
    loading: string
    notFoundTitle: string
    notFoundDesc: string
    wordCounter: (current: number, total: number) => string
    readThisSentence: string
    pronounce: string
    micIdleHint: string
    micRecordingHint: string
    scoringLabel: string
    passTitle: string
    passDesc: (score: number) => string
    tryAgainTitle: string
    tryAgainDesc: (score: number | null) => string
    heardNothing: string
    tryAgain: string
    moveOnAnyway: string
    continueButton: string
    finishButton: string
    endEarly: string
    completionTitle: string
    completionDesc: string
    micUnavailable: string
    scoringUnavailable: string
}> = {
    fil: {
        back: 'Bumalik',
        loading: 'Kinukuha ang reading coach...',
        notFoundTitle: 'Hindi Nahanap',
        notFoundDesc: 'Hindi na available ang materyal na ito.',
        wordCounter: (current, total) => `Salita ${current} sa ${total}`,
        readThisSentence: 'Basahin ang pangungusap na ito:',
        pronounce: 'Pakinggan',
        micIdleHint: 'Pindutin ang mikropono (o ang spacebar) at basahin nang malakas ang pangungusap.',
        micRecordingHint: 'Nakikinig... pindutin ulit (o ang spacebar) kapag tapos na.',
        scoringLabel: 'Sinusuri ang sinabi mo...',
        passTitle: 'Ang Galing!',
        passDesc: (score) => `Naitama mo! (${Math.round(score)}/100)`,
        tryAgainTitle: 'Muling Subukan',
        tryAgainDesc: (score) => (score == null ? 'Hindi malinaw na narinig.' : `Malapit na! (${Math.round(score)}/100)`),
        heardNothing: 'Walang narinig na malinaw sa salitang pinag-iiwanan. Subukan ulit nang mas malakas.',
        tryAgain: 'Subukan Ulit',
        moveOnAnyway: 'Tumuloy na Lang',
        continueButton: 'Susunod na Salita',
        finishButton: 'Tapusin ang Coaching',
        endEarly: 'Tapusin Muna',
        completionTitle: 'Natapos Mo ang Lahat ng Salita!',
        completionDesc: 'Nasanay mo na ang bawat salita sa listahang ito.',
        micUnavailable: 'Hindi available ang mikropono. Kailangan ng mikropono para dito.',
        scoringUnavailable: 'Hindi available ang scoring ngayon. Subukan ulit mamaya.',
    },
    en: {
        back: 'Back',
        loading: 'Loading your reading coach...',
        notFoundTitle: 'Not Found',
        notFoundDesc: "This material isn't available anymore.",
        wordCounter: (current, total) => `Word ${current} of ${total}`,
        readThisSentence: 'Read this sentence:',
        pronounce: 'Hear It',
        micIdleHint: 'Tap the mic (or press Space) and read the sentence out loud.',
        micRecordingHint: "Listening... tap again (or press Space) when you're done.",
        scoringLabel: 'Checking what you said...',
        passTitle: 'Nice Reading!',
        passDesc: (score) => `You got it! (${Math.round(score)}/100)`,
        tryAgainTitle: "Let's Try That Again",
        tryAgainDesc: (score) => (score == null ? "We couldn't hear that word clearly." : `So close! (${Math.round(score)}/100)`),
        heardNothing: "We didn't catch that word clearly. Try again a bit louder.",
        tryAgain: 'Try Again',
        moveOnAnyway: 'Move On Anyway',
        continueButton: 'Next Word',
        finishButton: 'Finish Coaching',
        endEarly: 'End Early',
        completionTitle: "You've Practiced Every Word!",
        completionDesc: "Great work — you've gone through every word on this list.",
        micUnavailable: "The microphone isn't available. Reading Coach needs a mic to work.",
        scoringUnavailable: 'Scoring is unavailable right now. Please try again later.',
    },
}
// Static fallback lines for the owl's speech bubble, keyed by coach
// state. Used for every non-'idle' state always, and for 'idle' only
// when the current word has no Gemini-generated coachTip. A few lines
// per state so it doesn't feel robotic on repeat words, picked
// deterministically (by word index) rather than randomly.
export const STATIC_COACH_TIPS: Record<Lang, Record<CoachState, string[]>> = {
    fil: {
        idle: [
            'Huminga muna, tapos subukan mong basahin nang malakas.',
            'Kapag handa ka na, pindutin ang mikropono.',
            'Basahin nang dahan-dahan at malinaw.',
        ],
        recording: ['Nakikinig ako...', 'Sige, basahin mo nang malakas at malinaw.'],
        scoring: ['Sandali lang, tinitingnan ko...', 'Hinahanap ko kung paano mo binigkas iyan.'],
        pass: ['Ang galing, tama iyan!', 'Perpekto! Sunod na tayo.'],
        fail: ['Malapit na iyan, subukan ulit!', 'Isa pang subok, kaya mo iyan!'],
    },
    en: {
        idle: [
            'Take a breath, then try reading it out loud.',
            "Whenever you're ready, tap the mic.",
            'Read it slowly and clearly — no rush.',
        ],
        recording: ["I'm listening...", 'Go ahead, read it clearly.'],
        scoring: ['Let me check that...', 'One sec, checking your reading.'],
        pass: ['Great job, that sounded perfect!', 'You nailed it! Nice reading.'],
        fail: ["Close! Let's try that word again.", "Almost there — you've got this."],
    },
}
export function getStaticCoachTip(state: CoachState, seed: number, lang: Lang): string {
    const pool = STATIC_COACH_TIPS[lang][state]
    return pool[seed % pool.length]
}