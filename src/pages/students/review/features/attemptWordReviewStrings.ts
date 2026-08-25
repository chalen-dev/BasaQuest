// File: src/pages/students/review/features/attemptWordReviewStrings.ts
//
// Bilingual copy for AttemptWordReview and its two sub-cards
// (PassageCard, WordListCard). Split out into its own file so those
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
    tapHintSelectMode: string
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
    selectWordsLabel: string
    doneLabel: string
    selectedCount: (n: number) => string
    selectNone: string
    setToCorrect: string
    setToMiscue: string
    clearSelection: string
    confirmDialogTitle: string
    confirmDialogText: string
    confirmDialogConfirmButton: string
    jumpDialogTitle: (word: string) => string
    jumpDialogText: string
    jumpDialogConfirmButton: string
    backToPassageLabel: string
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
        tapHint: 'Pindutin ang salita sa talata para tumalon dito sa listahan.',
        tapHintSelectMode: 'Nasa select mode: pindutin ang mga salita sa talata o sa listahan para piliin.',
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
        selectWordsLabel: 'Pumili ng mga Salita',
        doneLabel: 'Tapos na',
        selectedCount: (n) => `${n} napiling salita`,
        selectNone: 'Walang napiling salita — pindutin ang salita sa talata o sa listahan',
        setToCorrect: 'Gawing Tama',
        setToMiscue: 'Gawing Mali',
        clearSelection: 'I-clear',
        confirmDialogTitle: 'Isumite ang mga resultang ito?',
        confirmDialogText: 'Malapit mo nang kumpirmahin ang pagsusuring ito. Hindi na ito maaaring bawiin.',
        confirmDialogConfirmButton: 'Oo, Kumpirmahin',
        jumpDialogTitle: (word) => `Tumalon papunta sa "${word}"?`,
        jumpDialogText: 'Ito ay magpapababa papunta sa salitang iyon sa listahan.',
        jumpDialogConfirmButton: 'Tumalon',
        backToPassageLabel: 'Bumalik sa Talata',
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
        tapHint: 'Tap a word in the passage to jump to it in the list.',
        tapHintSelectMode: 'Select mode is on: tap words in the passage or the list to select them.',
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
        selectWordsLabel: 'Select Words',
        doneLabel: 'Done',
        selectedCount: (n) => `${n} word${n === 1 ? '' : 's'} selected`,
        selectNone: 'No words selected — tap words in the passage or the list',
        setToCorrect: 'Set to Correct',
        setToMiscue: 'Set to Miscue',
        clearSelection: 'Clear',
        confirmDialogTitle: 'Submit these results?',
        confirmDialogText: "You're about to confirm this review. This can't be undone.",
        confirmDialogConfirmButton: 'Yes, Confirm',
        jumpDialogTitle: (word) => `Jump to "${word}"?`,
        jumpDialogText: 'This scrolls down to that word in the list.',
        jumpDialogConfirmButton: 'Jump',
        backToPassageLabel: 'Back to Passage',
    },
}
export type AttemptWordReviewStrings = (typeof STRINGS)['en']