// File: src/pages/students/results/features/remediationPassagePreviewStrings.ts
//
// STRINGS record for RemediationPassagePreview.tsx — kept as its own
// file rather than folded into attemptResultsStrings.ts, matching this
// codebase's existing convention of scoping strings per screen
// (remediationCoachStrings.ts, remediationSessionStrings.ts), not
// centrally, even where two screens are part of one flow.
import type { Lang } from '../../../../components/buttons/LangToggle'

export const STRINGS: Record<Lang, {
    backButton: string
    backToRemediationButton: string
    pageTitle: string
    pageSubtitle: string
    loading: string
    notFoundTitle: string
    notFoundDesc: string
    generatingLabel: string
    generatingSubLabel: string
    generationErrorTitle: string
    generationErrorDesc: string
    retryButton: string
    startOverButton: string
    coverageGapTitle: string
    coverageGapDesc: string
    generateMoreButton: string
    generatingMoreLabel: string
    generateMoreErrorToast: string
    passageLabel: (current: number, total: number) => string
    discardButton: string
    regenerateButton: string
    regeneratingLabel: string
    noPassagesLeft: string
    saveButton: string
    savingButton: string
    saveWithoutPassagesNote: string
    saveSuccessToast: string
    saveErrorToast: string
    regenerateErrorToast: string
    draftRestoredToast: string
}> = {
    fil: {
        backButton: 'Bumalik sa Resulta',
        backToRemediationButton: 'Bumalik sa Remediation',
        pageTitle: 'Suriin ang mga Pagbasa',
        pageSubtitle: 'Ito ang mga pangungusap na gagawin ni Gemini para sa Reading Coach — suriin, alisin, o buuin muli ang mga ito bago i-save.',
        loading: 'Kinukuha ang datos...',
        notFoundTitle: 'Hindi Nahanap',
        notFoundDesc: 'Hindi na available ang pagbasang ito.',
        generatingLabel: 'Gumagawa ng mga pagbasa...',
        generatingSubLabel: 'Maaaring tumagal ito nang ilang segundo.',
        generationErrorTitle: 'Hindi nagawa ang mga pagbasa',
        generationErrorDesc: 'Nagkaproblema habang gumagawa ng mga pagbasa. Maaari kang subukan ulit, o i-save na lang ang materyal na walang mga pagbasa (magagamit pa rin ang mga salita sa flashcard na Practice session).',
        retryButton: 'Subukan Ulit',
        startOverButton: 'Simulan Ulit',
        coverageGapTitle: 'Hindi pa nasasakop na mga salita',
        coverageGapDesc: 'Wala pang pagbasang sumasaklaw sa mga salitang ito. Maaari ka pa ring mag-save — magagamit pa rin ang mga ito sa flashcard na Practice session.',
        generateMoreButton: 'Gumawa ng Pagbasa Para Rito',
        generatingMoreLabel: 'Gumagawa...',
        generateMoreErrorToast: 'Hindi nagawa ang bagong pagbasa. Subukan ulit.',
        passageLabel: (current, total) => `Pagbasa ${current} sa ${total}`,
        discardButton: 'Alisin',
        regenerateButton: 'Gawin Ulit',
        regeneratingLabel: 'Ginagawa ulit...',
        noPassagesLeft: 'Wala nang pagbasang natitira. I-save pa rin, o Simulan Ulit sa itaas.',
        saveButton: 'I-save ang Remediation Material',
        savingButton: 'Sine-save...',
        saveWithoutPassagesNote: 'Puwede mong i-save kahit walang mga pagbasa sa ibaba.',
        saveSuccessToast: 'Nagawa ang bagong remediation material.',
        saveErrorToast: 'Hindi nagawa ang remediation material. Subukan ulit.',
        regenerateErrorToast: 'Hindi nagawang muli ang pagbasang ito. Subukan ulit.',
        draftRestoredToast: 'Naibalik ang mga pagbasang na-save mo dati — hindi na ito ginawang muli.',
    },
    en: {
        backButton: 'Back to Results',
        backToRemediationButton: 'Back to Remediation',
        pageTitle: 'Review the Passages',
        pageSubtitle: "These are the passages Gemini wrote for Reading Coach Mode — review, discard, or regenerate them before saving.",
        loading: 'Loading data...',
        notFoundTitle: 'Not Found',
        notFoundDesc: "This reading isn't available anymore.",
        generatingLabel: 'Generating passages...',
        generatingSubLabel: 'This can take a few seconds.',
        generationErrorTitle: "Couldn't generate passages",
        generationErrorDesc: 'Something went wrong while generating passages. You can retry, or save the material without any passages (the words will still be available in the flashcard Practice session).',
        retryButton: 'Try Again',
        startOverButton: 'Start Over',
        coverageGapTitle: 'Words not yet covered',
        coverageGapDesc: "No passage covers these words yet. You can still save — they'll still be available in the flashcard Practice session.",
        generateMoreButton: 'Generate Passages For These',
        generatingMoreLabel: 'Generating...',
        generateMoreErrorToast: "Couldn't generate new passages. Please try again.",
        passageLabel: (current, total) => `Passage ${current} of ${total}`,
        discardButton: 'Discard',
        regenerateButton: 'Regenerate',
        regeneratingLabel: 'Regenerating...',
        noPassagesLeft: 'No passages left. You can still save, or Start Over above.',
        saveButton: 'Save Remediation Material',
        savingButton: 'Saving...',
        saveWithoutPassagesNote: 'You can save even without any passages below.',
        saveSuccessToast: 'New remediation material was generated.',
        saveErrorToast: "Couldn't save remediation material. Please try again.",
        regenerateErrorToast: "Couldn't regenerate that passage. Please try again.",
        draftRestoredToast: "Restored the passages you'd already generated — no need to make new ones.",
    },
}
export type RemediationPassagePreviewStrings = (typeof STRINGS)['en']
