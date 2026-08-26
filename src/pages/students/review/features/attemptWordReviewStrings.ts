// File: attemptWordReviewStrings.ts
// File: src/pages/students/review/features/attemptWordReviewStrings.ts
//
// Bilingual copy for AttemptWordReview and its two sub-cards
// (PassageCard, SelectedWordsCard). Split out into its own file so those
// components — and any future one that needs the same copy — can import
// just the strings without pulling in the whole orchestrator component.
import type { Lang } from '../../../../components/buttons/LangToggle'
export const STRINGS: Record<Lang, {
    kicker: string
    title: string
    forLabel: string
    accuracy: string
    fluency: string
    completeness: string
    prosody: string
    pronunciation: string
    needsAttention: (n: number) => string
    allClear: string
    tapHint: string
    legendCorrect: string
    legendMiscue: string
    legendInserted: string
    legendLowConfidence: string
    flagLabel: string
    typeLabel: string
    recognizedAs: (word: string) => string
    inserted: string
    confirmLabel: string
    confirming: string
    saveDraftLabel: string
    savingDraftLabel: string
    recordingLabel: string
    emptyWords: string
    confirmDialogTitle: string
    confirmDialogText: string
    confirmDialogConfirmButton: string
    backToPassageLabel: string
    selectedWordsKicker: string
    selectedWordsEmptyTitle: string
    selectedWordsEmptyHint: string
    clearAllLabel: string
}> = {
    fil: {
        kicker: 'Pagsusuri',
        title: 'Suriin ang Bawat Salita',
        forLabel: 'Para kay',
        accuracy: 'Katumpakan',
        fluency: 'Katatasan',
        completeness: 'Pagkakumpleto',
        prosody: 'Ritmo',
        pronunciation: 'Bigkas',
        needsAttention: (n) => `${n} salitang kailangan ng pansin`,
        allClear: 'Walang naka-flag na salita',
        tapHint: 'Pindutin ang salita sa talata para idagdag ito dito.',
        legendCorrect: 'Tama',
        legendMiscue: 'Mali',
        legendInserted: 'Idinagdag na salita',
        legendLowConfidence: 'Kailangan ng pansin',
        flagLabel: 'Kailangan ng Pansin',
        typeLabel: 'Uri:',
        recognizedAs: (word) => `narinig: "${word}"`,
        inserted: 'Idinagdag na salita',
        confirmLabel: 'Kumpirmahin ang Resulta',
        confirming: 'Isinusumite…',
        saveDraftLabel: 'I-save ang Draft',
        savingDraftLabel: 'Sine-save…',
        recordingLabel: 'Rekording',
        emptyWords: 'Wala pang word-level na datos para sa pagsusuring ito.',
        confirmDialogTitle: 'Isumite ang mga resultang ito?',
        confirmDialogText: 'Malapit mo nang kumpirmahin ang pagsusuring ito. Hindi na ito maaaring bawiin.',
        confirmDialogConfirmButton: 'Oo, Kumpirmahin',
        backToPassageLabel: 'Bumalik sa Talata',
        selectedWordsKicker: 'Mga Napiling Salita',
        selectedWordsEmptyTitle: 'Wala pang napiling salita',
        selectedWordsEmptyHint: 'Ang mga salitang pinindot mo sa talata ay lalabas dito, ang pinakabago sa itaas.',
        clearAllLabel: 'I-clear Lahat',
    },
    en: {
        kicker: 'Review',
        title: 'Review Each Word',
        forLabel: 'For',
        accuracy: 'Accuracy',
        fluency: 'Fluency',
        completeness: 'Completeness',
        prosody: 'Prosody',
        pronunciation: 'Pronunciation',
        needsAttention: (n) => `${n} word${n === 1 ? '' : 's'} flagged for attention`,
        allClear: 'No words flagged',
        tapHint: 'Tap a word in the passage to add it here.',
        legendCorrect: 'Correct',
        legendMiscue: 'Miscue',
        legendInserted: 'Inserted word',
        legendLowConfidence: 'Needs attention',
        flagLabel: 'Needs Attention',
        typeLabel: 'Type:',
        recognizedAs: (word) => `heard: "${word}"`,
        inserted: 'Inserted word',
        confirmLabel: 'Confirm Results',
        confirming: 'Submitting…',
        saveDraftLabel: 'Save Draft',
        savingDraftLabel: 'Saving…',
        recordingLabel: 'Recording',
        emptyWords: "There's no word-level data for this attempt yet.",
        confirmDialogTitle: 'Submit these results?',
        confirmDialogText: "You're about to confirm this review. This can't be undone.",
        confirmDialogConfirmButton: 'Yes, Confirm',
        backToPassageLabel: 'Back to Passage',
        selectedWordsKicker: 'Selected Words',
        selectedWordsEmptyTitle: 'No words selected yet',
        selectedWordsEmptyHint: "Words you tap in the passage will stack here, most recent on top.",
        clearAllLabel: 'Clear All',
    },
}
export type AttemptWordReviewStrings = (typeof STRINGS)['en']