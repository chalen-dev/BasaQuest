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
                .select('id, student_id, language, passage_title, grade_level, status, accuracy_score, fluency_score, pron_score, created_at, scored_at', { count: 'exact' })
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
                .select('id, student_id, language, passage_title, grade_level, status, accuracy_score, fluency_score, pron_score, created_at, scored_at, reviewed_at', { count: 'exact' })
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
// Writes every word's teacher verdict, marks the attempt reviewed, then
// PERMANENTLY removes the recording — both the file in the
// assessment-recordings bucket AND the audio_path column itself, in the
// same update() call that sets reviewed_at/reviewed_by. Nulling the
// column (not just deleting the file) is deliberate, not optional — the
// app's own privacy commitment is that a recording does not survive
// past initial review, so audio_path must actually reflect "there is no
// recording anymore" rather than continuing to point at a file that no
// longer exists. This is also what ResultsSummaryCard.tsx now keys off
// of to decide whether to show the audio player or a "no recording
// stored" message (see that file) — it checks attempt.audio_path, not
// just whether a signed URL happened to resolve.
//
// Order matters: the DB update (reviewed_at/reviewed_by/audio_path) runs
// FIRST and is allowed to throw normally — that's the actual "is this
// attempt reviewed" state and must succeed. The storage removal runs
// AFTER, and failures there are only logged (matching
// useDiscardAttemptMutation's own best-effort pattern) — a storage
// hiccup should never leave a teacher stuck unable to confirm a review,
// worst case is a leftover orphaned file in the bucket that audio_path
// no longer points to anyway.
export function useSubmitReviewMutation(teacherId: string | undefined) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ attemptId, overrides, audioPath }: { attemptId: string; overrides: WordReviewOverride[]; audioPath: string | null }) => {
            if (!teacherId) throw new Error('Missing teacher id')
            await writeWordReviewOverrides(overrides, teacherId)
            const nowIso = new Date().toISOString()
            const { error: attemptError } = await supabase
                .from('assessment_attempts')
                .update({ reviewed_at: nowIso, reviewed_by: teacherId, audio_path: null })
                .eq('id', attemptId)
            if (attemptError) throw attemptError
            if (audioPath) {
                const { error: storageError } = await supabase.storage
                    .from(RECORDINGS_BUCKET)
                    .remove([audioPath])
                if (storageError) {
                    console.error('useSubmitReviewMutation: failed to remove recording from storage', storageError)
                }
            }
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