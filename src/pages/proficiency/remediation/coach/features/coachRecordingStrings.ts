// File: src/pages/proficiency/remediation/coach/features/coachRecordingStrings.ts
//
// Words for Reading Coach Mode's recording: the microphone and cancel labels, the
// messages shown when a take is turned back (the same three guards the reading
// assessment has: nothing heard, too short, too long), and the owl's remark on
// the result. Kept apart from remediationCoachStrings.ts, which is the page's
// general copy.
import type { Lang } from '../../../../../components/buttons/LangToggle.tsx'

// Longest take, by passage length: about three seconds a word plus a little
// headroom, never under 30 seconds or over two minutes.
export function maxRecordingSeconds(wordCount: number): number {
    return Math.min(120, Math.max(30, Math.round(wordCount * 3) + 15))
}

export const RECORDING_STRINGS: Record<
    Lang,
    {
        record: string
        stop: string
        cancel: string
        scoring: string
        silent: string
        tooShort: string
        tooLong: string
        micDenied: string
        scoringFailed: string
        result: (correct: number, total: number) => string
        resultAll: string
        resultLegend: string
        clearResults: string
        resultsReady: (page: number) => string
        clearThisPage: string
        clearAllPages: string
    }
> = {
    fil: {
        record: 'Magsimulang mag-record',
        stop: 'Tapusin at i-score',
        cancel: 'Kanselahin ang recording',
        scoring: 'Sinusuri ang pagbasa…',
        silent: 'Hindi ka namin narinig. Lumapit sa mikropono at basahin muli ang talata.',
        tooShort: 'Masyadong maikli ang recording para sa buong talata. Basahin ang buong talata, pagkatapos ay subukan muli.',
        tooLong: 'Masyadong mahaba ang recording. Basahin lamang ang talata, pagkatapos ay pindutin ang tapos.',
        micDenied: 'Hindi pinayagan ang paggamit ng mikropono. Payagan ito sa browser para makapag-record.',
        scoringFailed: 'Hindi namin masuri ang pagbasa ngayon. Subukan muli.',
        result: (correct, total) => `${correct} sa ${total} salita ang tama. Berde: tama, kahel: mali ang bigkas, pula: nalaktawan.`,
        resultAll: 'Napakagaling! Tama ang lahat ng salita.',
        resultLegend: 'Berde: tama, kahel: mali ang bigkas, pula: nalaktawan.',
        clearResults: 'Burahin ang resulta',
        resultsReady: (page) => `Lumabas na ang resulta ng pagbasa sa pahina ${page}.`,
        clearThisPage: 'Sa pahinang ito',
        clearAllPages: 'Sa lahat ng pahina',
    },
    en: {
        record: 'Start recording',
        stop: 'Finish and score',
        cancel: 'Cancel recording',
        scoring: 'Checking your reading…',
        silent: "We couldn't hear you. Move closer to the microphone and read the passage again.",
        tooShort: 'That recording is too short for the whole passage. Read all of it, then try again.',
        tooLong: 'That recording is too long. Read just the passage, then press finish.',
        micDenied: 'Microphone access was denied. Allow it in your browser to record.',
        scoringFailed: "We couldn't check your reading right now. Please try again.",
        result: (correct, total) => `${correct} of ${total} words were right. Green: correct, orange: said it differently, red: skipped.`,
        resultAll: 'Wonderful! Every word was right.',
        resultLegend: 'Green: correct, orange: said it differently, red: skipped.',
        clearResults: 'Clear results',
        resultsReady: (page) => `Your results for page ${page} are ready.`,
        clearThisPage: 'This page only',
        clearAllPages: 'All pages',
    },
}
