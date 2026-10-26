// File: src/pages/admin/recording/session/hooks/useSaveRecording.ts
// Owns the full "Save & next" sequence for RecordSession.tsx: uploads the
// take's audio blob, replaces any existing recording for this sentence,
// inserts the new student_recordings row (flagged or clean), invalidates
// the relevant queries, then either advances to the next sentence or —
// when asked to annotate — hands the new recording id to the caller, which
// opens the word-annotation page (AnnotateRecordingPage). Word-level tags
// are written there, not here.
//
// Pulled out of RecordSession.tsx because this was the single largest,
// most self-contained chunk of that file (~130 lines) — everything it
// needs is passed in explicitly rather than reached for via closure over
// the whole component, and it now owns its own `saving` state instead of
// RecordSession.tsx tracking it on the hook's behalf.
import { useCallback, useState, type Dispatch, type SetStateAction } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../../../lib/supabaseClient'
import { showToast } from '../../../../../helpers/swalHelpers'
import { studentRecordingsKey, studentRecordingCountsKey } from '../../../_hooks/useStudentRecordings.ts'
import { FLAG_REASONS } from '../flagReasons'
type SentenceLike = { number: number; text: string }
type ExistingRecordingLike = { id: string; storage_path: string } | null
type UseSaveRecordingParams = {
    theme: string
    studentId: string
    sentenceSet: string
    userId: string | undefined
    audioUrl: string | null
    hasConsent: boolean
    current: SentenceLike | undefined
    existingRecording: ExistingRecordingLike
    seconds: number
    flagReasons: string[]
    sentenceIndex: number
    sentencesLength: number
    reset: () => void
    setSentenceIndex: Dispatch<SetStateAction<number>>
    clearTakeState: () => void
    incrementSavedCount: () => void
    onSavedForAnnotation: (recordingId: string) => void
}
export function useSaveRecording({
                                     theme,
                                     studentId,
                                     sentenceSet,
                                     userId,
                                     audioUrl,
                                     hasConsent,
                                     current,
                                     existingRecording,
                                     seconds,
                                     flagReasons,
                                     sentenceIndex,
                                     sentencesLength,
                                     reset,
                                     setSentenceIndex,
                                     clearTakeState,
                                     incrementSavedCount,
                                     onSavedForAnnotation,
                                 }: UseSaveRecordingParams) {
    const queryClient = useQueryClient()
    const [saving, setSaving] = useState(false)
    // eslint-disable-next-line react-hooks/preserve-manual-memoization
    const handleSave = useCallback(async (options?: { annotate?: boolean }) => {
        if (!hasConsent) return // Save button is disabled in this case anyway
        if (!audioUrl || !userId || !current) return
        setSaving(true)
        try {
            const blob = await fetch(audioUrl).then((r) => r.blob())
            const ext = blob.type.includes('mp4') ? 'm4a' : 'webm'
            const path = `${studentId}/${sentenceSet}-${current.number}-${Date.now()}.${ext}`
            const { error: uploadErr } = await supabase.storage
                .from('student-recordings')
                .upload(path, blob, { contentType: blob.type || 'audio/webm' })
            // noinspection ExceptionCaughtLocallyJS -- intentional: short-circuits to the shared catch block below
            if (uploadErr) throw uploadErr

            // Re-saving a sentence that already has a take — remove the old
            // row first so we never end up with two rows for the same
            // (student, set, sentence) combo. The DB delete is the part
            // that matters for correctness (its word_flags rows cascade
            // with it); if the storage cleanup after it fails, that's just
            // a wasted (unreferenced) file, not a dangling/broken
            // reference, so it's logged rather than thrown.
            if (existingRecording) {
                const { error: deleteRowErr } = await supabase
                    .from('student_recordings')
                    .delete()
                    .eq('id', existingRecording.id)
                // noinspection ExceptionCaughtLocallyJS -- intentional: short-circuits to the shared catch block below
                if (deleteRowErr) throw deleteRowErr
                const { error: removeStorageErr } = await supabase.storage
                    .from('student-recordings')
                    .remove([existingRecording.storage_path])
                if (removeStorageErr) {
                    console.warn('RecordSession: failed to remove old storage object', removeStorageErr)
                }
            }

            // A flagged take still gets uploaded and logged — just tagged
            // as discarded with why, rather than silently thrown away or
            // left looking identical to a clean take.
            const isFlagged = flagReasons.length > 0
            const flagNotes = isFlagged
                ? FLAG_REASONS.filter((r) => flagReasons.includes(r.key))
                    .map((r) => r.label)
                    .join(', ')
                : null

            // Status mapping — see the student_recording_word_flags migration
            // comment: discarded (whole-clip unusable) or fine_tuning (clean
            // read -> straight (audio, reference-phonemes) training pair).
            // A take with tagged word mistakes becomes 'evaluation' later,
            // when AnnotateRecordingPage saves its tags.
            const recordingStatus = isFlagged ? 'discarded' : 'fine_tuning'

            const { data: insertedRow, error: insertErr } = await supabase
                .from('student_recordings')
                .insert({
                    student_id: studentId,
                    recorded_by: userId,
                    sentence_set: sentenceSet,
                    sentence_number: current.number,
                    sentence_text: current.text,
                    storage_path: path,
                    duration_seconds: seconds,
                    status: recordingStatus,
                    ...(isFlagged ? { notes: flagNotes } : {}),
                })
                .select('id')
                .single()
            // noinspection ExceptionCaughtLocallyJS -- intentional: short-circuits to the shared catch block below
            if (insertErr) throw insertErr

            await queryClient.invalidateQueries({ queryKey: studentRecordingsKey(studentId) })
            await queryClient.invalidateQueries({ queryKey: studentRecordingCountsKey })

            incrementSavedCount()
            reset()
            clearTakeState()
            // A flagged (discarded) take can't be word-annotated, so it
            // skips straight to the next sentence even if annotate was asked.
            if (options?.annotate && !isFlagged && insertedRow) {
                onSavedForAnnotation(insertedRow.id)
                return
            }
            showToast(
                isFlagged
                    ? `Saved sentence ${current.number} (flagged: ${flagNotes}).`
                    : existingRecording
                        ? `Replaced the recording for sentence ${current.number}.`
                        : `Saved sentence ${current.number} for fine-tuning.`,
                isFlagged ? 'warning' : 'success',
                theme === 'dark',
                { timer: isFlagged ? 2200 : 1500 },
            )
            if (sentenceIndex < sentencesLength - 1) {
                setSentenceIndex((i) => i + 1)
            }
        } catch (err) {
            console.error('RecordSession: save failed', err)
            showToast(err instanceof Error ? err.message : 'Failed to save the recording.', 'error', theme === 'dark')
        } finally {
            setSaving(false)
        }
    }, [
        hasConsent,
        audioUrl,
        userId,
        current,
        studentId,
        sentenceSet,
        existingRecording,
        seconds,
        flagReasons,
        queryClient,
        theme,
        sentenceIndex,
        sentencesLength,
        reset,
        setSentenceIndex,
        clearTakeState,
        incrementSavedCount,
        onSavedForAnnotation,
    ])
    return { handleSave, saving }
}