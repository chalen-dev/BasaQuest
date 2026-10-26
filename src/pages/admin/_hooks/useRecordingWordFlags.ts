// File: src/pages/admin/_hooks/useRecordingWordFlags.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabaseClient.ts'
import {
    studentRecordingsKey,
    type StudentRecording,
} from './useStudentRecordings.ts'

export type WordFlagErrorType = 'omission' | 'insertion' | 'mispronunciation'

export type RecordingWordFlag = {
    id: string
    recording_id: string
    word_index: number
    word_text: string | null
    error_type: WordFlagErrorType
    notes: string | null
    spoken_text: string | null
}

// What the annotate page edits: per-word verdicts keyed by index into the
// sentence's words, plus free-text inserted words (no reference position).
export type WordAnnotation = { type: 'omission' } | { type: 'mispronunciation'; spokenText: string }
export type AnnotationDraft = {
    words: Record<number, WordAnnotation>
    insertions: string[]
}

const recordingKey = (id: string) => ['student_recording', id] as const
const wordFlagsKey = (id: string) => ['student_recording_word_flags', id] as const

export function useRecordingQuery(recordingId: string | undefined) {
    return useQuery({
        queryKey: recordingKey(recordingId ?? ''),
        queryFn: async () => {
            const { data, error } = await supabase
                .from('student_recordings')
                .select(
                    'id, student_id, sentence_set, sentence_number, sentence_text, storage_path, duration_seconds, status, notes, locked, created_at',
                )
                .eq('id', recordingId as string)
                .single()
            if (error) throw error
            return data as StudentRecording
        },
        enabled: !!recordingId,
    })
}

export function useRecordingWordFlagsQuery(recordingId: string | undefined) {
    return useQuery({
        queryKey: wordFlagsKey(recordingId ?? ''),
        queryFn: async () => {
            const { data, error } = await supabase
                .from('student_recording_word_flags')
                .select('id, recording_id, word_index, word_text, error_type, notes, spoken_text')
                .eq('recording_id', recordingId as string)
                .order('word_index', { ascending: true })
            if (error) throw error
            return (data ?? []) as RecordingWordFlag[]
        },
        enabled: !!recordingId,
    })
}

// Replace-all save: the page always holds the full set of tags, so the
// simplest correct write is delete-then-insert, then re-derive the
// recording's status (same mapping as useSaveRecording.ts: any tag ->
// evaluation, none -> fine_tuning). A discarded take is never touched here.
export function useSaveAnnotationMutation(recording: StudentRecording | undefined, words: string[]) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (draft: AnnotationDraft) => {
            if (!recording) throw new Error('Recording not loaded.')
            const { error: delErr } = await supabase
                .from('student_recording_word_flags')
                .delete()
                .eq('recording_id', recording.id)
            if (delErr) throw delErr

            const rows = [
                ...Object.entries(draft.words).map(([indexStr, ann]) => ({
                    recording_id: recording.id,
                    word_index: Number(indexStr),
                    word_text: words[Number(indexStr)] ?? null,
                    error_type: ann.type,
                    spoken_text: ann.type === 'mispronunciation' ? ann.spokenText.trim() || null : null,
                })),
                // Same placement rule as useSaveRecording.ts: after every real
                // word, in the order added.
                ...draft.insertions.map((word, i) => ({
                    recording_id: recording.id,
                    word_index: words.length + i + 1,
                    word_text: null,
                    error_type: 'insertion' as const,
                    notes: word,
                })),
            ]
            if (rows.length > 0) {
                const { error: insErr } = await supabase.from('student_recording_word_flags').insert(rows)
                if (insErr) throw insErr
            }

            const status = rows.length > 0 ? 'evaluation' : 'fine_tuning'
            const { error: updErr } = await supabase.from('student_recordings').update({ status }).eq('id', recording.id)
            if (updErr) throw updErr
            return status
        },
        onSuccess: () => {
            if (!recording) return
            queryClient.invalidateQueries({ queryKey: wordFlagsKey(recording.id) })
            queryClient.invalidateQueries({ queryKey: recordingKey(recording.id) })
            queryClient.invalidateQueries({ queryKey: studentRecordingsKey(recording.student_id) })
        },
    })
}
