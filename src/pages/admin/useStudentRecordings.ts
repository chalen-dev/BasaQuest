// File: src/pages/admin/useStudentRecordings.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabaseClient.ts'
export type StudentRecording = {
    id: string
    student_id: string
    sentence_set: string
    sentence_number: number
    sentence_text: string
    storage_path: string
    duration_seconds: number | null
    status: string
    notes: string | null
    created_at: string
}
const BUCKET = 'student-recordings'
export function studentRecordingsKey(studentId: string) {
    return ['student_recordings', studentId] as const
}
export const studentRecordingCountsKey = ['student_recordings', 'counts'] as const
// One roundtrip for every student's recording count, used by the roster
// row's "Recordings (N)" button so it doesn't have to fire a separate
// query per row. Counts client-side rather than a per-student count()
// query since the pilot's row volume is small.
export function useStudentRecordingCountsQuery() {
    return useQuery({
        queryKey: studentRecordingCountsKey,
        queryFn: async () => {
            const { data, error } = await supabase.from('student_recordings').select('student_id')
            if (error) throw error
            const counts: Record<string, number> = {}
            for (const row of data ?? []) {
                counts[row.student_id] = (counts[row.student_id] ?? 0) + 1
            }
            return counts
        },
    })
}
export function useStudentRecordingsQuery(studentId: string | null) {
    return useQuery({
        queryKey: studentRecordingsKey(studentId ?? ''),
        queryFn: async () => {
            const { data, error } = await supabase
                .from('student_recordings')
                .select(
                    'id, student_id, sentence_set, sentence_number, sentence_text, storage_path, duration_seconds, status, notes, created_at',
                )
                .eq('student_id', studentId as string)
                .order('sentence_set', { ascending: true })
                .order('sentence_number', { ascending: true })
            if (error) throw error
            return (data ?? []) as StudentRecording[]
        },
        enabled: !!studentId,
    })
}
export function useDeleteStudentRecordingMutation(studentId: string | null) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (recording: StudentRecording) => {
            const { error: storageErr } = await supabase.storage.from(BUCKET).remove([recording.storage_path])
            if (storageErr) throw storageErr
            const { error: deleteErr } = await supabase.from('student_recordings').delete().eq('id', recording.id)
            if (deleteErr) throw deleteErr
        },
        onSuccess: () => {
            if (studentId) queryClient.invalidateQueries({ queryKey: studentRecordingsKey(studentId) })
            queryClient.invalidateQueries({ queryKey: studentRecordingCountsKey })
        },
    })
}
// Private bucket — playback needs a short-lived signed URL, same pattern
// as consent files.
export function useStudentRecordingSignedUrl() {
    return useMutation({
        mutationFn: async (path: string) => {
            const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 300)
            if (error) throw error
            return data.signedUrl
        },
    })
}