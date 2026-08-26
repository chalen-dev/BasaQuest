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
// The only two error types the manual type-picker in WordListCard.tsx
// ever offers — Insertion and None aren't picker options (see the
// migration's own comment for why), so an override can only ever be one
// of these two, or null (no override, defer to the system's error_type).
export type ManualErrorTypeOverride = 'Omission' | 'Mispronunciation' | null
// Bucket a pupil's recording is uploaded to at submit time — mirrors
// RECORDINGS_BUCKET in
// proficiency/pre_assessment/assessment_session/features/useSubmitAttempt.ts.
// Kept as its own local constant rather than importing across into that
// unrelated feature folder, same self-containment call already made for
// useStudentProfileQuery below — but if that bucket name ever changes,
// it has to change in BOTH places.
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
// Counterpart to PendingReviewAttempt, for the Results tab
// (ResultsList.tsx) — same shape plus reviewed_at, which is always set
// for anything this list returns (see useReviewedAttemptsQuery's own
// `.not('reviewed_at', 'is', null)` filter).
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
    // Both added alongside the "Save Draft" feature — previously these
    // were local-only component state (manualFlags / manualErrorType in
    // AttemptWordReview.tsx) with no column at all, so they reset on
    // reload. See the migration comment for the full rationale.
    teacher_manual_flag: boolean
    teacher_error_type_override: ManualErrorTypeOverride
}
// Everything a teacher can edit for one word, bundled together — used by
// BOTH useSaveDraftMutation and useSubmitReviewMutation, since a final
// Confirm Results should persist manual flags/overrides just as much as
// a draft save does. The only difference between draft and final is
// whether reviewed_at/reviewed_by get set on assessment_attempts
// afterward.
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
// Ordered by created_at (ascending — oldest submitted reading first, so
// this behaves as a FIFO review queue) rather than scored_at. Scoring
// finishes on a separate async service (basaquest-scoring) at a variable
// delay after submission, so scored_at order could jumble two readings
// out of the order they actually came in — created_at is the stable,
// meaningful "when was this actually recorded" timestamp a teacher would
// expect a queue to be ordered by.
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
// Confirmed attempts — the counterpart to usePendingReviewAttemptsQuery,
// feeding the Results tab (ResultsList.tsx) where a teacher can browse
// back through readings they've already reviewed. Ordered by
// reviewed_at descending (most recently confirmed first) rather than
// created_at — unlike the pending queue (a FIFO worklist to clear),
// browsing past results is naturally "what did I just finish", not
// "what's oldest".
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
// Polls every 3s while the attempt is still pending/processing (scoring
// in flight on basaquest-scoring), stops once it lands on scored/failed.
export function useAttemptQuery(attemptId: string | null | undefined) {
    return useQuery({
        queryKey: attemptKey(attemptId),
        queryFn: async () => {
            const { data, error } = await supabase
                .from('assessment_attempts')
                .select('id, student_id, teacher_id, language, passage_title, passage_text, grade_level, status, error_message, accuracy_score, fluency_score, prosody_score, completeness_score, pron_score, audio_path, created_at, scored_at, reviewed_at, reviewed_by')
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
                .select('id, attempt_id, word_index, reference_word, recognized_word, error_type, accuracy_score, system_verdict, confidence, teacher_verdict, teacher_reviewed_at, teacher_reviewed_by, teacher_manual_flag, teacher_error_type_override')
                .eq('attempt_id', attemptId as string)
                .order('word_index', { ascending: true })
            if (error) throw error
            return (data ?? []) as AttemptWord[]
        },
        enabled: !!attemptId && enabled,
    })
}
// A pupil's recording lives in a PRIVATE bucket (nothing here is
// publicly readable — see the bucket's own RLS/storage policies), so
// playback needs a short-lived signed URL rather than a plain public
// URL. Re-fetched well before the 1-hour signature actually expires
// (staleTime below is 50 minutes) so a teacher who leaves the review
// page open doesn't hit a dead link mid-session. Disabled entirely when
// the attempt has no audio_path — older attempts predating this column,
// or anything that failed upload.
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
// Writes every word's verdict/flag/error-type-override in one go —
// shared by useSaveDraftMutation and useSubmitReviewMutation so a draft
// save and a final confirm persist identically at the word level; the
// only thing that differs between them is whether the ATTEMPT itself
// gets marked reviewed afterward. Every word gets written, not just
// changed ones — see useSubmitReviewMutation's own comment for why
// (Cohen's kappa agreement tracking needs agreement recorded too, not
// only disagreement).
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
// Persists the current in-progress review WITHOUT finalizing it — the
// attempt stays exactly where it was (still shows up in the pending
// review list, since reviewed_at stays null) but the next time this
// attempt is opened, AttemptWordReview.tsx can seed its state from
// teacher_verdict/teacher_manual_flag/teacher_error_type_override
// instead of starting over from the system's own defaults.
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
// Writes a teacher_verdict (plus manual flag / error-type override) for
// EVERY word, then marks the attempt itself reviewed — this is the
// terminal action; unlike useSaveDraftMutation, it also clears the
// attempt off the pending-review list (and onto the Results list — see
// reviewedAttemptsKey below).
export function useSubmitReviewMutation(teacherId: string | undefined) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ attemptId, overrides }: { attemptId: string; overrides: WordReviewOverride[] }) => {
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