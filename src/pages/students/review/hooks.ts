// File: hooks.ts
// File: src/pages/students/review/hooks.ts
//
// Data layer for the teacher-review feature — shared by both review
// surfaces: the inline "Now"-mode review step (used from
// AssessmentSession.tsx) and the "Send"-mode review list/detail pages
// under this same folder.
//
// Scoring happens async on the separate basaquest-scoring service (Azure
// Pronunciation Assessment) — submitting an attempt just kicks it off,
// it doesn't wait for it to finish (see useSubmitAttempt.ts). So an
// attempt sits at status 'pending'/'processing' for a few seconds before
// flipping to 'scored' (or 'failed'). useAttemptQuery polls while that's
// true so callers don't have to wire up their own timer.
//
// assessment_attempts.teacher_id is always populated correctly at
// submit time regardless of flow (see AssessmentSession.tsx's
// handleSubmit: the teacher's own id for "Now" mode, the pupil's own
// teacher_id for "Send"/self-serve mode) — so every query here filters
// directly on that indexed column instead of joining through profiles,
// matching how the existing "Teachers can view their pupils' attempts"
// RLS policy already allows it.
//
// Student names are fetched as a second query and joined in JS, not via
// a PostgREST embedded-resource select — same pattern already used by
// useAssignableStudentsQuery in the sibling proficiency/pre_assessment
// hooks.ts, rather than relying on guessing this project's auto-generated
// foreign-key constraint name.
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabaseClient'

export type AttemptStatus = 'pending' | 'processing' | 'scored' | 'failed'
export type ErrorType = 'None' | 'Omission' | 'Insertion' | 'Mispronunciation'
export type Verdict = 'correct' | 'miscue'

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
}

export type WordVerdictOverride = { wordId: string; verdict: Verdict }

export type ReviewStudentProfile = {
    id: string
    full_name: string | null
    username: string | null
    grade_level: number | null
}

export const REVIEW_PAGE_SIZE = 8

const pendingReviewCountKey = (teacherId: string | undefined) => ['pending-review-count', teacherId] as const
const pendingReviewAttemptsKey = (teacherId: string | undefined) => ['pending-review-attempts', teacherId] as const
const attemptKey = (attemptId: string | null | undefined) => ['attempt', attemptId] as const
const attemptWordsKey = (attemptId: string | null | undefined) => ['attempt-words', attemptId] as const

// Shared by the ProtectedHeader "Students" pill badge and the Dashboard
// stat card — one source of truth so the two never drift out of sync.
// Polled (not realtime) since scoring finishes on a separate service; a
// teacher sitting on either screen should see the count update within a
// few seconds of a new attempt landing, not just on next navigation.
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
                .order('scored_at', { ascending: true })
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

// Polls every 3s while the attempt is still pending/processing (scoring
// in flight on basaquest-scoring), stops once it lands on scored/failed.
export function useAttemptQuery(attemptId: string | null | undefined) {
    return useQuery({
        queryKey: attemptKey(attemptId),
        queryFn: async () => {
            const { data, error } = await supabase
                .from('assessment_attempts')
                .select('id, student_id, teacher_id, language, passage_title, passage_text, grade_level, status, error_message, accuracy_score, fluency_score, prosody_score, completeness_score, pron_score, created_at, scored_at, reviewed_at, reviewed_by')
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

// `enabled` is threaded through explicitly (rather than just checking
// attemptId) so callers can gate this off until the attempt has actually
// reached 'scored' — there's nothing to fetch before then.
export function useAttemptWordsQuery(attemptId: string | null | undefined, enabled: boolean) {
    return useQuery({
        queryKey: attemptWordsKey(attemptId),
        queryFn: async () => {
            const { data, error } = await supabase
                .from('assessment_attempt_words')
                .select('id, attempt_id, word_index, reference_word, recognized_word, error_type, accuracy_score, system_verdict, confidence, teacher_verdict, teacher_reviewed_at, teacher_reviewed_by')
                .eq('attempt_id', attemptId as string)
                .order('word_index', { ascending: true })
            if (error) throw error
            return (data ?? []) as AttemptWord[]
        },
        enabled: !!attemptId && enabled,
    })
}

// Writes a teacher_verdict for EVERY word (not just the ones the teacher
// actually flipped) — that's deliberate, not wasted writes: the whole
// point of teacher_verdict living alongside system_verdict (per the
// column's own migration comment) is to let a Cohen's kappa agreement
// rate be computed later, which needs a human judgment recorded for
// every word, agreement included, not just disagreements. Then marks the
// attempt itself reviewed.
export function useSubmitReviewMutation(teacherId: string | undefined) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ attemptId, verdicts }: { attemptId: string; verdicts: WordVerdictOverride[] }) => {
            if (!teacherId) throw new Error('Missing teacher id')
            const nowIso = new Date().toISOString()
            const wordResults = await Promise.all(
                verdicts.map((v) =>
                    supabase
                        .from('assessment_attempt_words')
                        .update({ teacher_verdict: v.verdict, teacher_reviewed_at: nowIso, teacher_reviewed_by: teacherId })
                        .eq('id', v.wordId)
                )
            )
            const wordError = wordResults.find((r) => r.error)?.error
            if (wordError) throw wordError
            const { error: attemptError } = await supabase
                .from('assessment_attempts')
                .update({ reviewed_at: nowIso, reviewed_by: teacherId })
                .eq('id', attemptId)
            if (attemptError) throw attemptError
        },
        onSuccess: (_data, { attemptId }) => {
            queryClient.invalidateQueries({ queryKey: pendingReviewCountKey(teacherId) })
            queryClient.invalidateQueries({ queryKey: pendingReviewAttemptsKey(teacherId) })
            queryClient.invalidateQueries({ queryKey: attemptKey(attemptId) })
            queryClient.invalidateQueries({ queryKey: attemptWordsKey(attemptId) })
        },
    })
}

// Used by TeacherReviewAttempt.tsx to show whose reading this is — a
// small standalone lookup rather than reusing
// proficiency/pre_assessment/hooks.ts's useAssistedStudentProfile, to
// keep the review feature's data layer self-contained in this folder
// instead of reaching across into an unrelated feature.
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