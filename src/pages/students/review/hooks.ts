// File: hooks.ts
// File: src/pages/students/review/hooks.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabaseClient'
export type AttemptStatus = 'pending' | 'processing' | 'scored' | 'failed'
export type ErrorType = 'None' | 'Omission' | 'Insertion' | 'Mispronunciation'
export type Verdict = 'correct' | 'miscue'
export type ManualErrorTypeOverride = 'Omission' | 'Mispronunciation' | null
const RECORDINGS_BUCKET = 'assessment-recordings'
export type PendingReviewAttempt = {
    id: string
    student_id: string
    language: 'en' | 'fil'
    passage_title: string | null
    grade_level: string | null
    status: AttemptStatus
    accuracy_score: number | null
    fluency_score: number | null
    pron_score: number | null
    created_at: string
    scored_at: string | null
    // Recording deletion deadline — created_at + 7 days, set once at
    // insert (20260812060319) and never touched again, review or not.
    // Drives the "days left" badge in ReviewList.tsx.
    purge_after: string
    student: { full_name: string | null; username: string | null; grade_level: number | null } | null
}
export type ReviewedAttempt = {
    id: string
    student_id: string
    language: 'en' | 'fil'
    passage_title: string | null
    grade_level: string | null
    status: AttemptStatus
    accuracy_score: number | null
    fluency_score: number | null
    pron_score: number | null
    created_at: string
    scored_at: string | null
    reviewed_at: string
    // Same deadline as PendingReviewAttempt.purge_after — recordings now
    // survive review, so ResultsList.tsx shows the same countdown until
    // the purge-expired-recordings job (see its migration) deletes it.
    purge_after: string
    student: { full_name: string | null; username: string | null; grade_level: number | null } | null
}
export type AttemptDetail = {
    id: string
    student_id: string
    teacher_id: string | null
    language: 'en' | 'fil'
    passage_title: string | null
    passage_text: string
    grade_level: string | null
    status: AttemptStatus
    error_message: string | null
    accuracy_score: number | null
    fluency_score: number | null
    prosody_score: number | null
    completeness_score: number | null
    pron_score: number | null
    audio_path: string | null
    duration_seconds: number | null
    created_at: string
    scored_at: string | null
    reviewed_at: string | null
    reviewed_by: string | null
}
export type AttemptWord = {
    id: string
    attempt_id: string
    word_index: number
    reference_word: string | null
    recognized_word: string | null
    error_type: ErrorType
    accuracy_score: number | null
    system_verdict: Verdict
    confidence: 'high' | 'low'
    teacher_verdict: Verdict | null
    teacher_reviewed_at: string | null
    teacher_reviewed_by: string | null
    teacher_manual_flag: boolean
    teacher_error_type_override: ManualErrorTypeOverride
}
export type WordReviewOverride = {
    wordId: string
    verdict: Verdict
    manualFlag: boolean
    errorTypeOverride: ManualErrorTypeOverride
}
export type ReviewStudentProfile = {
    id: string
    full_name: string | null
    username: string | null
    grade_level: number | null
}
export const REVIEW_PAGE_SIZE = 8
const pendingReviewCountKey = (teacherId: string | undefined) => ['pending-review-count', teacherId] as const
const pendingReviewAttemptsKey = (teacherId: string | undefined) => ['pending-review-attempts', teacherId] as const
const reviewedAttemptsKey = (teacherId: string | undefined) => ['reviewed-attempts', teacherId] as const
const attemptKey = (attemptId: string | null | undefined) => ['attempt', attemptId] as const
const attemptWordsKey = (attemptId: string | null | undefined) => ['attempt-words', attemptId] as const
export function usePendingReviewCountQuery(teacherId: string | undefined) {
    return useQuery({
        queryKey: pendingReviewCountKey(teacherId),
        queryFn: async () => {
            const { count, error } = await supabase
                .from('assessment_attempts')
                .select('id', { count: 'exact', head: true })
                .eq('teacher_id', teacherId as string)
                .eq('status', 'scored')
                .is('reviewed_at', null)
            if (error) throw error
            return count ?? 0
        },
        enabled: !!teacherId,
        refetchInterval: 15000,
    })
}
type PendingReviewAttemptsArgs = { teacherId: string | undefined; page: number }
export function usePendingReviewAttemptsQuery({ teacherId, page }: PendingReviewAttemptsArgs) {
    return useQuery({
        queryKey: [...pendingReviewAttemptsKey(teacherId), page],
        queryFn: async () => {
            const from = page * REVIEW_PAGE_SIZE
            const to = from + REVIEW_PAGE_SIZE - 1
            const { data: attempts, error, count } = await supabase
                .from('assessment_attempts')
                .select('id, student_id, language, passage_title, grade_level, status, accuracy_score, fluency_score, pron_score, created_at, scored_at, purge_after', { count: 'exact' })
                .eq('teacher_id', teacherId as string)
                .eq('status', 'scored')
                .is('reviewed_at', null)
                .order('created_at', { ascending: true })
                .range(from, to)
            if (error) throw error
            const studentIds = Array.from(new Set((attempts ?? []).map((a) => a.student_id)))
            let studentsById = new Map<string, { full_name: string | null; username: string | null; grade_level: number | null }>()
            if (studentIds.length > 0) {
                const { data: students, error: studentsError } = await supabase
                    .from('profiles')
                    .select('id, full_name, username, grade_level')
                    .in('id', studentIds)
                if (studentsError) throw studentsError
                studentsById = new Map((students ?? []).map((s) => [s.id, { full_name: s.full_name, username: s.username, grade_level: s.grade_level }]))
            }
            const withStudent: PendingReviewAttempt[] = (attempts ?? []).map((a) => ({
                ...a,
                student: studentsById.get(a.student_id) ?? null,
            }))
            return { attempts: withStudent, total: count ?? 0 }
        },
        enabled: !!teacherId,
        placeholderData: (prev) => prev,
    })
}
type ReviewedAttemptsArgs = { teacherId: string | undefined; page: number }
export function useReviewedAttemptsQuery({ teacherId, page }: ReviewedAttemptsArgs) {
    return useQuery({
        queryKey: [...reviewedAttemptsKey(teacherId), page],
        queryFn: async () => {
            const from = page * REVIEW_PAGE_SIZE
            const to = from + REVIEW_PAGE_SIZE - 1
            const { data: attempts, error, count } = await supabase
                .from('assessment_attempts')
                .select('id, student_id, language, passage_title, grade_level, status, accuracy_score, fluency_score, pron_score, created_at, scored_at, reviewed_at, purge_after', { count: 'exact' })
                .eq('teacher_id', teacherId as string)
                .not('reviewed_at', 'is', null)
                .order('reviewed_at', { ascending: false })
                .range(from, to)
            if (error) throw error
            const studentIds = Array.from(new Set((attempts ?? []).map((a) => a.student_id)))
            let studentsById = new Map<string, { full_name: string | null; username: string | null; grade_level: number | null }>()
            if (studentIds.length > 0) {
                const { data: students, error: studentsError } = await supabase
                    .from('profiles')
                    .select('id, full_name, username, grade_level')
                    .in('id', studentIds)
                if (studentsError) throw studentsError
                studentsById = new Map((students ?? []).map((s) => [s.id, { full_name: s.full_name, username: s.username, grade_level: s.grade_level }]))
            }
            const withStudent: ReviewedAttempt[] = (attempts ?? []).map((a) => ({
                ...a,
                reviewed_at: a.reviewed_at as string,
                student: studentsById.get(a.student_id) ?? null,
            }))
            return { attempts: withStudent, total: count ?? 0 }
        },
        enabled: !!teacherId,
        placeholderData: (prev) => prev,
    })
}
export function useAttemptQuery(attemptId: string | null | undefined) {
    return useQuery({
        queryKey: attemptKey(attemptId),
        queryFn: async () => {
            const { data, error } = await supabase
                .from('assessment_attempts')
                .select('id, student_id, teacher_id, language, passage_title, passage_text, grade_level, status, error_message, accuracy_score, fluency_score, prosody_score, completeness_score, pron_score, audio_path, duration_seconds, created_at, scored_at, reviewed_at, reviewed_by')
                .eq('id', attemptId as string)
                .single()
            if (error) throw error
            return data as AttemptDetail
        },
        enabled: !!attemptId,
        refetchInterval: (query) => {
            const status = query.state.data?.status
            return status === 'pending' || status === 'processing' ? 3000 : false
        },
    })
}
export function useAttemptWordsQuery(attemptId: string | null | undefined, enabled: boolean) {
    return useQuery({
        queryKey: attemptWordsKey(attemptId),
        queryFn: async () => {
            const { data, error } = await supabase
                .from('assessment_attempt_words')
                .select('id, attempt_id, word_index, reference_word, recognized_word, error_type, accuracy_score, system_verdict, confidence, teacher_verdict, teacher_reviewed_at, teacher_reviewed_by, teacher_manual_flag, teacher_error_type_override')
                .eq('attempt_id', attemptId as string)
                .order('word_index', { ascending: true })
            if (error) throw error
            return (data ?? []) as AttemptWord[]
        },
        enabled: !!attemptId && enabled,
    })
}
export function useAttemptAudioUrlQuery(audioPath: string | null | undefined) {
    return useQuery({
        queryKey: ['attempt-audio-url', audioPath],
        queryFn: async () => {
            const { data, error } = await supabase.storage
                .from(RECORDINGS_BUCKET)
                .createSignedUrl(audioPath as string, 3600)
            if (error) throw error
            return data.signedUrl
        },
        enabled: !!audioPath,
        staleTime: 50 * 60 * 1000,
    })
}
async function writeWordReviewOverrides(overrides: WordReviewOverride[], teacherId: string) {
    const nowIso = new Date().toISOString()
    const results = await Promise.all(
        overrides.map((o) =>
            supabase
                .from('assessment_attempt_words')
                .update({
                    teacher_verdict: o.verdict,
                    teacher_reviewed_at: nowIso,
                    teacher_reviewed_by: teacherId,
                    teacher_manual_flag: o.manualFlag,
                    teacher_error_type_override: o.errorTypeOverride,
                })
                .eq('id', o.wordId)
        )
    )
    const wordError = results.find((r) => r.error)?.error
    if (wordError) throw wordError
}
export function useSaveDraftMutation(teacherId: string | undefined) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ attemptId, overrides }: { attemptId: string; overrides: WordReviewOverride[] }) => {
            if (!teacherId) throw new Error('Missing teacher id')
            await writeWordReviewOverrides(overrides, teacherId)
            return { attemptId }
        },
        onSuccess: ({ attemptId }) => {
            queryClient.invalidateQueries({ queryKey: attemptWordsKey(attemptId) })
        },
    })
}
// Writes every word's teacher verdict and marks the attempt reviewed.
//
// CHANGED: this used to also null audio_path and delete the recording
// from storage immediately on confirm. That's no longer how deletion
// works — recordings now live for a fixed 7 days from when the attempt
// was CREATED (assessment_attempts.purge_after, set once at insert and
// never touched here), whether or not — and regardless of when — a
// teacher confirms the review. Actual deletion is handled by the
// purge-expired-recordings Edge Function, run daily via pg_cron (see
// supabase/migrations/20260903120000_add_recording_purge_cron.sql).
// Confirming a review no longer has any effect on the recording at all.
//
// audioPath is kept as a parameter (now unused) so this still accepts
// the same call shape as before without touching every call site.
export function useSubmitReviewMutation(teacherId: string | undefined) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ attemptId, overrides }: { attemptId: string; overrides: WordReviewOverride[]; audioPath: string | null }) => {
            if (!teacherId) throw new Error('Missing teacher id')
            await writeWordReviewOverrides(overrides, teacherId)
            const nowIso = new Date().toISOString()
            const { error: attemptError } = await supabase
                .from('assessment_attempts')
                .update({ reviewed_at: nowIso, reviewed_by: teacherId })
                .eq('id', attemptId)
            if (attemptError) throw attemptError
        },
        onSuccess: (_data, { attemptId }) => {
            queryClient.invalidateQueries({ queryKey: pendingReviewCountKey(teacherId) })
            queryClient.invalidateQueries({ queryKey: pendingReviewAttemptsKey(teacherId) })
            queryClient.invalidateQueries({ queryKey: reviewedAttemptsKey(teacherId) })
            queryClient.invalidateQueries({ queryKey: attemptKey(attemptId) })
            queryClient.invalidateQueries({ queryKey: attemptWordsKey(attemptId) })
        },
    })
}
export function useReopenAttemptMutation(teacherId: string | undefined) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (attemptId: string) => {
            const { error } = await supabase
                .from('assessment_attempts')
                .update({ reviewed_at: null, reviewed_by: null })
                .eq('id', attemptId)
            if (error) throw error
            return { attemptId }
        },
        onSuccess: ({ attemptId }) => {
            queryClient.invalidateQueries({ queryKey: pendingReviewCountKey(teacherId) })
            queryClient.invalidateQueries({ queryKey: pendingReviewAttemptsKey(teacherId) })
            queryClient.invalidateQueries({ queryKey: reviewedAttemptsKey(teacherId) })
            queryClient.invalidateQueries({ queryKey: attemptKey(attemptId) })
            queryClient.invalidateQueries({ queryKey: attemptWordsKey(attemptId) })
        },
    })
}
export function useDiscardAttemptMutation(teacherId: string | undefined) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ attemptId, audioPath }: { attemptId: string; audioPath: string | null }) => {
            const { error: wordsError } = await supabase
                .from('assessment_attempt_words')
                .delete()
                .eq('attempt_id', attemptId)
            if (wordsError) throw wordsError
            if (audioPath) {
                const { error: storageError } = await supabase.storage
                    .from(RECORDINGS_BUCKET)
                    .remove([audioPath])
                if (storageError) {
                    console.error('useDiscardAttemptMutation: failed to remove recording from storage', storageError)
                }
            }
            const { error: attemptError } = await supabase
                .from('assessment_attempts')
                .delete()
                .eq('id', attemptId)
            if (attemptError) throw attemptError
            return { attemptId }
        },
        onSuccess: ({ attemptId }) => {
            queryClient.invalidateQueries({ queryKey: pendingReviewCountKey(teacherId) })
            queryClient.invalidateQueries({ queryKey: pendingReviewAttemptsKey(teacherId) })
            queryClient.invalidateQueries({ queryKey: reviewedAttemptsKey(teacherId) })
            queryClient.invalidateQueries({ queryKey: attemptKey(attemptId) })
            queryClient.invalidateQueries({ queryKey: attemptWordsKey(attemptId) })
        },
    })
}
export function useStudentProfileQuery(studentId: string | null | undefined) {
    return useQuery({
        queryKey: ['review-student-profile', studentId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, username, grade_level')
                .eq('id', studentId as string)
                .single()
            if (error) throw error
            return data as ReviewStudentProfile
        },
        enabled: !!studentId,
    })
}