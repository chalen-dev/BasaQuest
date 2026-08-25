// File: assessmentSessionStrings.ts
// File: src/pages/proficiency/pre_assessment/assessment_session/assessmentSessionStrings.ts
// Shared types, copy, and small pure helpers for the reading check-in
// session screen (AssessmentSession.tsx) — split out so that file only
// has to hold layout/behavior, not ~250 lines of bilingual strings.
//
// USE_PLACEHOLDER_PASSAGE moved to the root devFlags.ts (single-file
// switch for every "skip this expensive external call" flag in the app)
// — PLACEHOLDER_PASSAGES itself (the actual fake data) still lives here.
import type { Lang } from '../../../../components/buttons/LangToggle.tsx'

export type Passage = {
    title: string
    passage: string
}

export type Step = 'intro' | 'loading' | 'passage' | 'error'

// Hard cap on a single take, in seconds, so a forgotten-running mic can't
// produce an unbounded recording. NOT derived from any real Azure/Deepgram
// pricing or limit — there's no scoring integration wired up yet (see
// generate-passage/index.ts's header comment) — just a reasonable
// placeholder. Revisit once real pricing/limits are known.
export const MAX_RECORDING_SECONDS = 180

export const PLACEHOLDER_PASSAGES: Record<Lang, Passage> = {
    fil: {
        title: '[Placeholder] Ang Munting Ibon',
        passage: 'Ito ay isang placeholder na talata sa Filipino, hindi galing sa Gemini. Ginagamit ito para subukan ang disenyo ng pahinang ito nang hindi gumagamit ng AI credits. Puwede mo itong basahin nang malakas para makita kung paano lalabas ang buong talata dito.',
    },
    en: {
        title: '[Placeholder] The Little Bird',
        passage: 'This is a placeholder English passage, not from Gemini. It exists so the page layout can be tested — spacing, line length, the title, the badges above it — without spending any AI credits. Feel free to read it aloud just like a real generated passage to see how it looks in place.',
    },
}

export function formatSeconds(total: number): string {
    const m = Math.floor(total / 60)
    const s = total % 60
    return `${m}:${String(s).padStart(2, '0')}`
}

export type AssessmentStrings = {
    filipinoLabel: string
    englishLabel: string
    kicker: string
    title: string
    introDesc: string
    gradeLabel: (n: number) => string
    start: string
    loadingMessage: string
    regenerate: string
    nonReaderKicker: string
    nonReaderTitle: string
    nonReaderDesc: string
    nonReaderComingSoon: string
    errorTitle: string
    errorDesc: string
    retry: string
    assistedBannerLabel: string
    readyLabel: string
    recordingLabel: string
    recordedLabel: string
    hintIdle: string
    hintRecording: string
    hintRecorded: string
    micUnavailable: string
    continueNoMic: string
    simulatedTake: string
    redoLabel: string
    submitLabel: string
    submitting: string
    recorderEncourage: string
    pendingTitle: string
    pendingDesc: string
    timeLimitNote: (mins: number) => string
    pageLabel: (i: number, total: number) => string
    prevPage: string
    nextPage: string
    readAllHint: string
    noisyEnvironmentWarning: string
    micHint: string
    clearHighlightsHint: string
    pageNavHint: string
    prevPageHint: string
    redoHint: string
    submitHint: string
    // Assisted ("Now" mode) inline review — the teacher stays on this
    // screen after submitting instead of getting the permanent "waiting
    // for teacher" card, since the teacher IS the one reviewing here.
    scoringTitle: string
    scoringDesc: string
    reviewConfirmedToast: string
}

export const STRINGS: Record<Lang, AssessmentStrings> = {
    fil: {
        filipinoLabel: 'Filipino',
        englishLabel: 'English',
        kicker: 'Unang Hakbang',
        title: 'Pagsusuri sa Kasanayan sa Pagbasa',
        introDesc: 'Bubuo ang ating kaibigang kuwago ng isang maikling talata na bagay sa iyong baitang — babasahin mo ito nang malakas sa iyong guro. Walang mali o tamang paraan dito.',
        gradeLabel: (n) => `Baitang ${n}`,
        start: 'Simulan',
        loadingMessage: 'Gumagawa ng talata para sa iyo…',
        regenerate: 'Bumuo ng Ibang Talata',
        nonReaderKicker: 'Sa Ngayon',
        nonReaderTitle: 'Simula muna sa Batayang Kasanayan',
        nonReaderDesc: 'Naka-mark ang account na ito bilang bagong nagbabasa, kaya mas mainam munang magsanay sa mga letra, pantig, at simpleng salita bago sa buong talata.',
        nonReaderComingSoon: 'Ang bahaging ito (letra, pantig, CVC na salita) ay ginagawa pa — darating na ito.',
        errorTitle: 'Naku, may problema.',
        errorDesc: 'Hindi namin nabuo ang talata ngayon. Subukan ulit.',
        retry: 'Subukan Ulit',
        assistedBannerLabel: 'Ginagawa para kay',
        readyLabel: 'HANDA NA?',
        recordingLabel: 'NAGRE-RECORD…',
        recordedLabel: 'TAPOS NA — PAKINGGAN',
        hintIdle: 'Pindutin ang mikropono para magsimula.',
        hintRecording: 'Pindutin ang parisukat kapag tapos ka na.',
        hintRecorded: 'Pakinggan muna ang iyong pagbasa bago ipasa sa guro.',
        micUnavailable: 'Hindi available ang mikropono ngayon.',
        continueNoMic: 'Magpatuloy nang walang mikropono →',
        simulatedTake: 'Simulated na pagbasa (walang mikropono)',
        redoLabel: 'Ulitin',
        submitLabel: 'Ipasa sa Guro',
        submitting: 'Ipinapadala…',
        recorderEncourage: 'Huwag mag-alala kung may mali — susuriin muna ito ng iyong guro bago maging pinal.',
        pendingTitle: 'Hinihintay ang Guro',
        pendingDesc: 'Naipasa na ang iyong pagbasa. Susuriin ito ng iyong guro bago maging pinal ang resulta.',
        timeLimitNote: (mins) => `May limitasyong ${mins} minuto ang pag-record.`,
        pageLabel: (i, total) => `Pahina ${i}/${total}`,
        prevPage: '← Nakaraan',
        nextPage: 'Susunod →',
        readAllHint: 'Basahin ang bawat pahina — patuloy lang ang pag-record.',
        noisyEnvironmentWarning: 'Medyo maingay sa paligid — subukang maghanap ng mas tahimik na lugar.',
        micHint: 'Pindutin ang mikropono para magsimulang magbasa nang malakas! 🎙️',
        clearHighlightsHint: 'Puwede mong tapikin ang mga salita para markahan ito — pindutin dito para tanggalin lahat! 🖍️',
        pageNavHint: 'Marami pang pahina! Gamitin ang mga buton na ito para lumipat — patuloy lang ang pag-record. 📖',
        prevPageHint: 'Puwede ka ring bumalik sa naunang pahina para muling basahin! ⬅️',
        redoHint: 'Hindi kontento sa recording? Pindutin dito para ulitin! 🔁',
        submitHint: 'Tapos ka na? Pindutin dito para ipasa sa iyong guro! ✅',
        scoringTitle: 'Sinusuri ang Pagbasa',
        scoringDesc: 'Ilang segundo lang ito — sinusuri ng sistema ang bawat salita bago mo ito ma-kumpirma.',
        reviewConfirmedToast: 'Nakumpirma ang resulta.',
    },
    en: {
        filipinoLabel: 'Filipino',
        englishLabel: 'English',
        kicker: 'First Step',
        title: 'Reading Skills Check-In',
        introDesc: "Our owl friend will put together a short passage suited to your grade — you'll read it aloud to your teacher. There's no right or wrong way to do this.",
        gradeLabel: (n) => `Grade ${n}`,
        start: 'Start',
        loadingMessage: 'Writing a passage just for you…',
        regenerate: 'Generate a Different Passage',
        nonReaderKicker: 'For Now',
        nonReaderTitle: 'Starting with the Basics',
        nonReaderDesc: "This account is flagged as a new reader, so it's better to practice letters, syllables, and simple words before a full passage.",
        nonReaderComingSoon: 'This part (letters, syllables, CVC words) is still being built — coming soon.',
        errorTitle: 'Oops, something went wrong.',
        errorDesc: "We couldn't put together a passage right now. Please try again.",
        retry: 'Try Again',
        assistedBannerLabel: 'Recording for',
        readyLabel: 'READY?',
        recordingLabel: 'RECORDING…',
        recordedLabel: 'DONE — LISTEN BACK',
        hintIdle: 'Press the microphone to start.',
        hintRecording: 'Press the square when you are done.',
        hintRecorded: 'Listen to your reading first before submitting.',
        micUnavailable: 'The microphone is not available right now.',
        continueNoMic: 'Continue without a microphone →',
        simulatedTake: 'Simulated reading (no microphone)',
        redoLabel: 'Redo',
        submitLabel: 'Submit to Teacher',
        submitting: 'Sending…',
        recorderEncourage: "Don't worry about mistakes — your teacher reviews it first before it's final.",
        pendingTitle: 'Waiting for Teacher',
        pendingDesc: 'Your reading has been submitted. Your teacher will review it before the result is final.',
        timeLimitNote: (mins) => `Recording is limited to ${mins} minutes.`,
        pageLabel: (i, total) => `Page ${i}/${total}`,
        prevPage: '← Previous',
        nextPage: 'Next →',
        readAllHint: 'Read each page — recording keeps going.',
        noisyEnvironmentWarning: "It's a bit noisy right now — try to find a quieter spot.",
        micHint: 'Press the microphone to start reading aloud! 🎙️',
        clearHighlightsHint: 'You can tap words to mark them — press here to clear them all! 🖍️',
        pageNavHint: 'There are more pages! Use these buttons to flip through — recording keeps going. 📖',
        prevPageHint: 'You can go back to reread earlier pages too! ⬅️',
        redoHint: 'Not happy with your take? Tap here to record again! 🔁',
        submitHint: 'All done? Tap here to send it to your teacher! ✅',
        scoringTitle: 'Scoring the Reading',
        scoringDesc: "This only takes a few seconds — the system is scoring each word before you confirm the results.",
        reviewConfirmedToast: 'Results confirmed.',
    },
}