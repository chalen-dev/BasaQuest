// File: attemptWordReviewStrings.ts
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
    // Discard button (see AttemptWordReview.tsx's own comment) — a
    // permanent, one-way delete of the whole attempt. The confirmation
    // dialog copy below is deliberately more severe than
    // confirmDialogTitle/Text (Confirm Results is a one-way door too,
    // but it still leaves the attempt's data around; this erases it).
    discardLabel: string
    discarding: string
    discardDialogTitle: string
    discardDialogText: string
    discardDialogConfirmButton: string
    // Shown as a periodic toast (see AttemptWordReview.tsx's REMINDER
    // INTERVAL comment) only while there are unsaved verdict/flag/type
    // edits sitting in local state — not shown at all once the teacher
    // has saved (draft or confirm) or made no edits yet.
    unsavedReminderToast: string
    // LAST SAVED LABEL (see AttemptWordReview.tsx's own comment) — the
    // small caption above the Save Draft/Confirm Results buttons.
    lastSavedNever: string
    lastSavedJustNow: string
    lastSavedMinutesAgo: (n: number) => string
    lastSavedHoursAgo: (n: number) => string
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