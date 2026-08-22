// File: src/pages/admin/recording/session/hooks/useSaveRecording.ts
// Owns the full "Save & next" sequence for RecordSession.tsx: uploads the
// take's audio blob, replaces any existing recording for this sentence,
// inserts the new student_recordings row (with whole-clip flag notes or
// word-level status as appropriate), writes word-level ground-truth rows
// when the take has tagged mistakes, invalidates the relevant queries,
// then clears local per-take state and advances to the next sentence.
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
import { studentRecordingsKey, studentRecordingCountsKey } from '../../../useStudentRecordings.ts'
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
    wordFlags: Record<number, 'mispronunciation' | 'omission'>
    insertions: string[]
    words: string[]
    hasWordLevelIssues: boolean
    sentenceIndex: number
    sentencesLength: number
    reset: () => void
    setSentenceIndex: Dispatch<SetStateAction<number>>
    clearTakeState: () => void
    incrementSavedCount: () => void
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
                                     wordFlags,
                                     insertions,
                                     words,
                                     hasWordLevelIssues,
                                     sentenceIndex,
                                     sentencesLength,
                                     reset,
                                     setSentenceIndex,
                                     clearTakeState,
                                     incrementSavedCount,
                                 }: UseSaveRecordingParams) {
    const queryClient = useQueryClient()
    const [saving, setSaving] = useState(false)
    // eslint-disable-next-line react-hooks/preserve-manual-memoization
    const handleSave = useCallback(async () => {
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
            // comment: discarded (whole-clip unusable) beats evaluation (real
            // tagged word mistakes -> GOP-scorer ground truth) beats
            // fine_tuning (clean read -> straight (audio, reference-phonemes)
            // training pair).
            const recordingStatus = isFlagged ? 'discarded' : hasWordLevelIssues ? 'evaluation' : 'fine_tuning'

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

            // Word-level ground-truth rows only make sense for a take that
            // wasn't thrown out whole-clip.
            if (!isFlagged && hasWordLevelIssues && insertedRow) {
                const wordFlagRows = [
                    ...Object.entries(wordFlags).map(([indexStr, errorType]) => ({
                        recording_id: insertedRow.id,
                        word_index: Number(indexStr),
                        word_text: words[Number(indexStr)] ?? null,
                        error_type: errorType,
                    })),
                    // Insertions have no fixed reference position — placed
                    // after every real word, in the order they were added.
                    ...insertions.map((word, i) => ({
                        recording_id: insertedRow.id,
                        word_index: words.length + i + 1,
                        word_text: null,
                        error_type: 'insertion' as const,
                        notes: word,
                    })),
                ]
                const { error: wordFlagErr } = await supabase.from('student_recording_word_flags').insert(wordFlagRows)
                if (wordFlagErr) {
                    console.error('RecordSession: failed to save word-level flags', wordFlagErr)
                    showToast('Recording saved, but the word-level tags failed to save.', 'warning', theme === 'dark')
                }
            }

            await queryClient.invalidateQueries({ queryKey: studentRecordingsKey(studentId) })
            await queryClient.invalidateQueries({ queryKey: studentRecordingCountsKey })

            incrementSavedCount()
            reset()
            clearTakeState()
            showToast(
                isFlagged
                    ? `Saved sentence ${current.number} (flagged: ${flagNotes}).`
                    : hasWordLevelIssues
                        ? `Saved sentence ${current.number} as labeled evaluation data.`
                        : existingRecording
                            ? `Replaced the recording for sentence ${current.number}.`
                            : `Saved sentence ${current.number} for fine-tuning.`,
                isFlagged ? 'warning' : 'success',
                theme === 'dark',
                { timer: isFlagged || hasWordLevelIssues ? 2200 : 1500 },
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
        wordFlags,
        insertions,
        words,
        hasWordLevelIssues,
        queryClient,
        theme,
        sentenceIndex,
        sentencesLength,
        reset,
        setSentenceIndex,
        clearTakeState,
        incrementSavedCount,
    ])
    return { handleSave, saving }
}