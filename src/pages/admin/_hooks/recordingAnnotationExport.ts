// File: src/pages/admin/_hooks/recordingAnnotationExport.ts
// Builds the annotation JSON that ships alongside a downloaded recording
// (RecordingHistoryPage: single Download writes a sidecar .json when the
// take has tags; Download all adds one annotations.json to the zip).
//
// Deliberately carries student_id only — no name. These are recordings of
// children, and the export is meant for model evaluation/training work,
// so it stays pseudonymous by default.
import { supabase } from '../../../lib/supabaseClient.ts'
import type { StudentRecording } from './useStudentRecordings.ts'
import type { RecordingWordFlag } from './useRecordingWordFlags.ts'

export type AnnotatedWordExport = {
    index: number
    text: string
    verdict: 'correct' | 'omission' | 'mispronunciation'
    spoken_text: string | null
}

export type RecordingAnnotationExport = {
    file: string
    student_id: string
    script: string
    sentence_number: number
    sentence_text: string
    duration_seconds: number | null
    recorded_at: string
    status: string
    quality_flags: string[]
    // null for a discarded take — it was thrown out whole-clip, so its
    // words were never annotated.
    words: AnnotatedWordExport[] | null
    insertions: string[]
}

export async function fetchWordFlagsByRecording(recordingIds: string[]): Promise<Map<string, RecordingWordFlag[]>> {
    const byRecording = new Map<string, RecordingWordFlag[]>()
    if (recordingIds.length === 0) return byRecording
    const { data, error } = await supabase
        .from('student_recording_word_flags')
        .select('id, recording_id, word_index, word_text, error_type, notes, spoken_text')
        .in('recording_id', recordingIds)
        .order('word_index', { ascending: true })
    if (error) throw error
    for (const row of (data ?? []) as RecordingWordFlag[]) {
        const list = byRecording.get(row.recording_id) ?? []
        list.push(row)
        byRecording.set(row.recording_id, list)
    }
    return byRecording
}

export function buildAnnotationExport(
    recording: StudentRecording,
    file: string,
    flags: RecordingWordFlag[],
): RecordingAnnotationExport {
    const discarded = recording.status === 'discarded'
    const sentenceWords = recording.sentence_text.split(/\s+/).filter(Boolean)
    const flagByIndex = new Map<number, RecordingWordFlag>()
    const insertions: string[] = []
    for (const f of flags) {
        if (f.error_type === 'insertion') {
            if (f.notes) insertions.push(f.notes)
        } else {
            flagByIndex.set(f.word_index, f)
        }
    }
    return {
        file,
        student_id: recording.student_id,
        script: recording.sentence_set,
        sentence_number: recording.sentence_number,
        sentence_text: recording.sentence_text,
        duration_seconds: recording.duration_seconds,
        recorded_at: recording.created_at,
        status: recording.status,
        quality_flags: recording.notes ? recording.notes.split(', ') : [],
        words: discarded
            ? null
            : sentenceWords.map((text, index) => {
                const flag = flagByIndex.get(index)
                return {
                    index,
                    text,
                    verdict: flag ? (flag.error_type as 'omission' | 'mispronunciation') : 'correct',
                    spoken_text: flag?.spoken_text ?? null,
                }
            }),
        insertions,
    }
}
