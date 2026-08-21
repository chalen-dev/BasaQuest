// File: src/pages/admin/useConsentFiles.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabaseClient.ts'
import { useAuth } from '../../contexts/AuthContext.tsx'
export type ConsentFile = {
    id: string
    student_id: string
    storage_path: string
    original_filename: string | null
    created_at: string
}
const BUCKET = 'consent-files'
export const MAX_CONSENT_FILES = 4
export function consentFilesKey(studentId: string) {
    return ['consent_files', studentId] as const
}
export function useConsentFilesQuery(studentId: string | null) {
    return useQuery({
        queryKey: consentFilesKey(studentId ?? ''),
        queryFn: async () => {
            const { data, error } = await supabase
                .from('finetune_student_consent_files')
                .select('id, student_id, storage_path, original_filename, created_at')
                .eq('student_id', studentId as string)
                .order('created_at', { ascending: true })
            if (error) throw error
            return (data ?? []) as ConsentFile[]
        },
        enabled: !!studentId,
    })
}
export function useUploadConsentFileMutation(studentId: string | null) {
    const { user } = useAuth()
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (file: File) => {
            if (!studentId) throw new Error('Save the student before attaching files.')
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
            const path = `${studentId}/${crypto.randomUUID()}-${safeName}`
            const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(path, file, {
                contentType: file.type || 'application/octet-stream',
            })
            if (uploadErr) throw uploadErr
            const { error: insertErr } = await supabase.from('finetune_student_consent_files').insert({
                student_id: studentId,
                storage_path: path,
                original_filename: file.name,
                uploaded_by: user?.id ?? null,
            })
            if (insertErr) {
                // Roll back the uploaded blob so a rejected insert (e.g. hit
                // the 4-file cap) doesn't leave an orphaned file behind.
                await supabase.storage.from(BUCKET).remove([path])
                throw insertErr
            }
        },
        onSuccess: () => {
            if (studentId) queryClient.invalidateQueries({ queryKey: consentFilesKey(studentId) })
        },
    })
}
export function useDeleteConsentFileMutation(studentId: string | null) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (file: ConsentFile) => {
            const { error: storageErr } = await supabase.storage.from(BUCKET).remove([file.storage_path])
            if (storageErr) throw storageErr
            const { error: deleteErr } = await supabase
                .from('finetune_student_consent_files')
                .delete()
                .eq('id', file.id)
            if (deleteErr) throw deleteErr
        },
        onSuccess: () => {
            if (studentId) queryClient.invalidateQueries({ queryKey: consentFilesKey(studentId) })
        },
    })
}
// The bucket is private, so viewing a file means minting a short-lived
// signed URL on demand rather than linking straight to a public path.
export function useConsentFileSignedUrl() {
    return useMutation({
        mutationFn: async (path: string) => {
            const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60)
            if (error) throw error
            return data.signedUrl
        },
    })
}