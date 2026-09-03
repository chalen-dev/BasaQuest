// File: attemptWordReviewStrings.ts
// File: attemptWordReviewStrings.ts
// File: src/pages/students/review/features/attemptWordReviewStrings.ts
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
    discardLabel: string
    discarding: string
    discardDialogTitle: string
    discardDialogText: string
    discardDialogConfirmButton: string
    unsavedReminderToast: string
    lastSavedNever: string
    lastSavedJustNow: string
    lastSavedMinutesAgo: (n: number) => string
    lastSavedHoursAgo: (n: number) => string
    recordingLabel: string
    noRecordingMessage: string
    emptyWords: string
    confirmDialogTitle: string
    confirmDialogText: string
    confirmDialogConfirmButton: string
    backToPassageLabel: string
    selectedWordsKicker: string
    selectedWordsEmptyTitle: string
    selectedWordsEmptyHint: string
    clearAllLabel: string
    // DRAGGABLE DIVIDER (AttemptWordReview.tsx, between
    // ResultsSummaryCard and PassageCard) — tooltip on the drag handle.
    dividerHint: string
    // WORD SEARCH (SelectedWordsCard.tsx) — the search box that lets a
    // teacher find any word in the whole passage (not just the current
    // stack) and click it to add it to the stack.
    searchPlaceholder: string
    searchResultsLabel: (n: number) => string
    searchNoResults: string
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
        discardLabel: 'Itapon',
        discarding: 'Itinatapon…',
        discardDialogTitle: 'Itapon ang pagbasang ito?',
        discardDialogText: 'Permanenteng buburahin nito ang pagbasang ito kasama ang lahat ng datos nito — ang rekording, at bawat salita. Hindi na ito maaaring bawiin.',
        discardDialogConfirmButton: 'Oo, Itapon',
        unsavedReminderToast: 'May mga hindi pa na-save na pagbabago — huwag kalimutang i-save ang draft.',
        lastSavedNever: 'Wala pang na-save',
        lastSavedJustNow: 'Na-save ngayon lang',
        lastSavedMinutesAgo: (n) => `Na-save ${n} minuto ang nakalipas`,
        lastSavedHoursAgo: (n) => `Na-save ${n} oras ang nakalipas`,
        recordingLabel: 'Rekording',
        noRecordingMessage: 'Wala nang naka-imbak na rekording para sa pagbasang ito — awtomatiko itong tinatanggal kapag nakumpirma na ang resulta.',
        emptyWords: 'Wala pang word-level na datos para sa pagsusuring ito.',
        confirmDialogTitle: 'Isumite ang mga resultang ito?',
        confirmDialogText: 'Malapit mo nang kumpirmahin ang pagsusuring ito. Permanente ring mabubura ang rekording — hindi mo na ito maririnig muli, pero maaari mo pa ring i-edit ang mga resulta kung kinakailangan. Hindi na ito maaaring bawiin.',
        confirmDialogConfirmButton: 'Oo, Kumpirmahin',
        backToPassageLabel: 'Bumalik sa Talata',
        selectedWordsKicker: 'Mga Napiling Salita',
        selectedWordsEmptyTitle: 'Wala pang napiling salita',
        selectedWordsEmptyHint: 'Ang mga salitang pinindot mo sa talata ay lalabas dito, ang pinakabago sa itaas.',
        clearAllLabel: 'I-clear Lahat',
        dividerHint: 'I-drag para baguhin ang laki',
        searchPlaceholder: 'Maghanap ng salita...',
        searchResultsLabel: (n) => `${n} resultang salita`,
        searchNoResults: 'Walang nahanap na tumutugmang salita.',
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
        discardLabel: 'Discard',
        discarding: 'Discarding…',
        discardDialogTitle: 'Discard this reading?',
        discardDialogText: "This permanently deletes this attempt and everything tied to it — the recording and every word. This can't be undone.",
        discardDialogConfirmButton: 'Yes, Discard',
        unsavedReminderToast: "You've got unsaved changes — don't forget to save your draft.",
        lastSavedNever: 'Not saved yet',
        lastSavedJustNow: 'Saved just now',
        lastSavedMinutesAgo: (n) => `Saved ${n}m ago`,
        lastSavedHoursAgo: (n) => `Saved ${n}h ago`,
        recordingLabel: 'Recording',
        noRecordingMessage: 'No recording is stored for this reading — it was automatically deleted once the results were confirmed.',
        emptyWords: "There's no word-level data for this attempt yet.",
        confirmDialogTitle: 'Submit these results?',
        confirmDialogText: "You're about to confirm this review. This will also permanently delete the recording — you won't be able to listen to it again, but you can still edit the results afterward if needed. This can't be undone.",
        confirmDialogConfirmButton: 'Yes, Confirm',
        backToPassageLabel: 'Back to Passage',
        selectedWordsKicker: 'Selected Words',
        selectedWordsEmptyTitle: 'No words selected yet',
        selectedWordsEmptyHint: "Words you tap in the passage will stack here, most recent on top.",
        clearAllLabel: 'Clear All',
        dividerHint: 'Drag to resize',
        searchPlaceholder: 'Search for a word...',
        searchResultsLabel: (n) => `${n} match${n === 1 ? '' : 'es'}`,
        searchNoResults: 'No matching words found.',
    },
}
export type AttemptWordReviewStrings = (typeof STRINGS)['en']