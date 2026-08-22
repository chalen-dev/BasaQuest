// File: src/pages/admin/recording/session/flagReasons.ts
// Whole-clip quality flags — see RecordSession.tsx's header comment for
// the two-tier flagging model. Keys are what gets joined into
// student_recordings.notes; labels are what the admin sees. Shared
// between useSaveRecording.ts (labels used to build the notes string)
// and QualityFlagChips.tsx (renders the chip row) so there's exactly one
// list to keep in sync.
//
// "Misread / wrong words" used to live here, but word-level tagging now
// covers that case precisely (which words, not just "something's off"),
// so it was removed — a take with real word mistakes should be tagged
// per-word and saved as 'evaluation', not thrown out as 'discarded'.
export const FLAG_REASONS = [
    { key: 'noise', label: 'Background noise' },
    { key: 'cutoff', label: 'Cut off / incomplete' },
    { key: 'wrong_sentence', label: 'Wrong sentence read' },
    { key: 'other', label: 'Other issue' },
] as const
export type FlagReasonKey = (typeof FLAG_REASONS)[number]['key']