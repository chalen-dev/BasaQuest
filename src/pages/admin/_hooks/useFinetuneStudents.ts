// File: src/pages/admin/useFinetuneStudents.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabaseClient.ts'
import { useAuth } from '../../../contexts/AuthContext.tsx'
export type ReadingTier = 'below' | 'on' | 'above'
export type FinetuneStudent = {
    id: string
    full_name: string
    grade_level: number | null
    gender: string | null
    reading_tier: ReadingTier | null
    consent_on_file: boolean
    notes: string | null
    recording_locked: boolean
}
export type NewFinetuneStudent = {
    full_name: string
    grade_level: number | null
    gender: string | null
    reading_tier: ReadingTier | null
    consent_on_file: boolean
    notes?: string | null
}
export type UpdateFinetuneStudentPayload = NewFinetuneStudent & { id: string }
const SELECT_COLUMNS = 'id, full_name, grade_level, gender, reading_tier, consent_on_file, notes, recording_locked'
export const finetuneStudentsKey = ['finetune_students'] as const
export function useFinetuneStudentsQuery() {
    return useQuery({
        queryKey: finetuneStudentsKey,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('finetune_students')
                .select(SELECT_COLUMNS)
                .order('full_name', { ascending: true })
            if (error) throw error
            return (data ?? []) as FinetuneStudent[]
        },
    })
}
export function useCreateFinetuneStudentMutation() {
    const { user } = useAuth()
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (input: NewFinetuneStudent) => {
            const { data, error } = await supabase
                .from('finetune_students')
                .insert({ ...input, created_by: user?.id ?? null })
                .select(SELECT_COLUMNS)
                .single()
            if (error) throw error
            return data as FinetuneStudent
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: finetuneStudentsKey })
        },
    })
}
export function useUpdateFinetuneStudentMutation() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, ...patch }: UpdateFinetuneStudentPayload) => {
            const { data, error } = await supabase
                .from('finetune_students')
                .update(patch)
                .eq('id', id)
                .select(SELECT_COLUMNS)
                .single()
            if (error) throw error
            return data as FinetuneStudent
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: finetuneStudentsKey })
        },
    })
}
// The recording_locked flag is deliberately NOT settable through the
// regular update mutation above — it only ever changes via this RPC
// (see the migration's set_finetune_student_recording_lock function),
// which is a SECURITY DEFINER function that bypasses the "can't update a
// locked row" RLS policy, since locking/unlocking has to work even while
// the row is currently locked.
export function useSetRecordingLockMutation() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, locked }: { id: string; locked: boolean }) => {
            const { error } = await supabase.rpc('set_finetune_student_recording_lock', { p_id: id, p_locked: locked })
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: finetuneStudentsKey })
        },
    })
}
// Both consent-files and student-recordings store objects under a
// "<student_id>/..." folder, so deleting everything for a student is just
// listing that folder and removing whatever's in it — no need to track
// individual paths, and it still works even if the DB rows referencing
// them were already gone (e.g. from a previous partial failure).
async function removeStorageFolder(bucket: string, folder: string) {
    const { data, error } = await supabase.storage.from(bucket).list(folder)
    if (error) throw error
    if (!data || data.length === 0) return
    const paths = data.map((f) => `${folder}/${f.name}`)
    const { error: removeErr } = await supabase.storage.from(bucket).remove(paths)
    if (removeErr) throw removeErr
}
export function useDeleteFinetuneStudentMutation() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (id: string) => {
            // Deleting the row cascades finetune_student_consent_files and
            // student_recordings at the DB level, but Postgres cascade never
            // touches Storage — without this, the actual consent-form scans
            // and audio blobs would be orphaned in both buckets forever.
            // Note: the delete itself will simply fail (RLS) if the student
            // is recording_locked — that's enforced at the DB level, not here.
            await Promise.all([
                removeStorageFolder('consent-files', id),
                removeStorageFolder('student-recordings', id),
            ])
            const { error } = await supabase.from('finetune_students').delete().eq('id', id)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: finetuneStudentsKey })
        },
    })
}