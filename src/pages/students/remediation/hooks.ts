// File: src/pages/students/remediation/hooks.ts
//
// Data layer for "remediation material" — teacher-generated, per-attempt
// snapshots of a pupil's flagged words, created via the Generate button
// on AttemptResults.tsx (see that file's own comment), browsed via
// RemediationList.tsx / StudentRemediationDetail.tsx, and now practiced
// via a teacher-led session (RemediationSession.tsx) that marks
// individual words as practiced and persists that back here.
//
// v1 IS TEACHER-ONLY: remediation_materials' RLS only ever lets the
// generating teacher (or the pupil's assigned teacher) read/write these
// rows — a pupil account has no policy here at all yet.
//
// SNAPSHOT, BUT NOT STRICTLY IMMUTABLE ANYMORE: the words/generation
// metadata (language, passage_title, dominant_error_type) still freeze
// at generation time — see this file's original header comment for why
// (surviving a discarded source attempt, not drifting if the attempt is
// later reopened and re-reviewed). What CAN change post-generation is
// each word entry's `practiced` flag and the row's `last_practiced_at`,
// written by useUpdateRemediationProgressMutation below whenever a
// session saves progress. That's a deliberate, narrow exception — the
// diagnostic content itself never changes, only whether it's been
// drilled.
//
// STUDENTS-WITH-MATERIAL LISTING: there's no dedicated SQL view/RPC for
// "distinct students with a count and latest date" — this fetches the
// (small, teacher-scoped) set of raw rows and aggregates + paginates
// client-side instead. Fine at this app's scale; revisit with a real
// GROUP BY / view if this ever needs to scale past that.
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabaseClient'
import type { ErrorType } from '../review/hooks'

export type RemediationWordEntry = {
    word: string
    errorType: Exclude<ErrorType, 'None'>
    count: number
    // Added for the remediation-session feature — absent on any row
    // generated before this feature existed, which the client treats
    // identically to false (see readPracticed() below) rather than
    // requiring a backfill migration for old rows.
    practiced?: boolean
}

export type RemediationMaterial = {
    id: string
    attempt_id: string | null
    student_id: string
    teacher_id: string | null
    language: 'en' | 'fil'
    passage_title: string | null
    dominant_error_type: string | null
    word_count: number
    words: RemediationWordEntry[]
    created_at: string
    last_practiced_at: string | null
}

export type StudentWithRemediation = {
    student_id: string
    full_name: string | null
    username: string | null
    grade_level: number | null
    material_count: number
    latest_created_at: string
}

export const REMEDIATION_PAGE_SIZE = 8

// Reads a word entry's practiced flag, treating a missing key (rows
// generated before this feature existed) the same as false — see
// RemediationWordEntry's own comment.
export function readPracticed(entry: RemediationWordEntry): boolean {
    return entry.practiced === true
}

const remediationStudentsKey = (teacherId: string | undefined) => ['remediation-students', teacherId] as const
const remediationMaterialsKey = (studentId: string | undefined) => ['remediation-materials', studentId] as const
const remediationMaterialKey = (materialId: string | undefined) => ['remediation-material', materialId] as const

type StudentsWithRemediationArgs = { teacherId: string | undefined; page: number }

export function useStudentsWithRemediationQuery({ teacherId, page }: StudentsWithRemediationArgs) {
    return useQuery({
        queryKey: [...remediationStudentsKey(teacherId), page],
        queryFn: async () => {
            const { data: rows, error } = await supabase
                .from('remediation_materials')
                .select('student_id, created_at')
                .eq('teacher_id', teacherId as string)
                .order('created_at', { ascending: false })
            if (error) throw error

            const byStudent = new Map<string, { count: number; latest: string }>()
            for (const row of rows ?? []) {
                const existing = byStudent.get(row.student_id)
                if (existing) {
                    existing.count += 1
                } else {
                    byStudent.set(row.student_id, { count: 1, latest: row.created_at })
                }
            }

            const studentIds = Array.from(byStudent.keys())
            let studentsById = new Map<string, { full_name: string | null; username: string | null; grade_level: number | null }>()
            if (studentIds.length > 0) {
                const { data: students, error: studentsError } = await supabase
                    .from('profiles')
                    .select('id, full_name, username, grade_level')
                    .in('id', studentIds)
                if (studentsError) throw studentsError
                studentsById = new Map((students ?? []).map((s) => [s.id, { full_name: s.full_name, username: s.username, grade_level: s.grade_level }]))
            }

            const all: StudentWithRemediation[] = studentIds
                .map((id) => {
                    const agg = byStudent.get(id)!
                    const student = studentsById.get(id)
                    return {
                        student_id: id,
                        full_name: student?.full_name ?? null,
                        username: student?.username ?? null,
                        grade_level: student?.grade_level ?? null,
                        material_count: agg.count,
                        latest_created_at: agg.latest,
                    }
                })
                .sort((a, b) => (a.latest_created_at < b.latest_created_at ? 1 : -1))

            const total = all.length
            const from = page * REMEDIATION_PAGE_SIZE
            const students = all.slice(from, from + REMEDIATION_PAGE_SIZE)
            return { students, total }
        },
        enabled: !!teacherId,
        placeholderData: (prev) => prev,
    })
}

export function useStudentRemediationMaterialsQuery(studentId: string | undefined) {
    return useQuery({
        queryKey: remediationMaterialsKey(studentId),
        queryFn: async () => {
            const { data, error } = await supabase
                .from('remediation_materials')
                .select('id, attempt_id, student_id, teacher_id, language, passage_title, dominant_error_type, word_count, words, created_at, last_practiced_at')
                .eq('student_id', studentId as string)
                .order('created_at', { ascending: false })
            if (error) throw error
            return (data ?? []) as RemediationMaterial[]
        },
        enabled: !!studentId,
    })
}

// Single-material fetch for RemediationSession.tsx — the session page
// is reached by materialId (from a "Start Remediation" button on one
// card in StudentRemediationDetail.tsx), not by studentId, so it needs
// its own targeted query rather than pulling the whole list and
// filtering client-side.
export function useRemediationMaterialQuery(materialId: string | undefined) {
    return useQuery({
        queryKey: remediationMaterialKey(materialId),
        queryFn: async () => {
            const { data, error } = await supabase
                .from('remediation_materials')
                .select('id, attempt_id, student_id, teacher_id, language, passage_title, dominant_error_type, word_count, words, created_at, last_practiced_at')
                .eq('id', materialId as string)
                .single()
            if (error) throw error
            return data as RemediationMaterial
        },
        enabled: !!materialId,
    })
}

type GenerateRemediationMaterialArgs = {
    attemptId: string
    studentId: string
    language: 'en' | 'fil'
    passageTitle: string | null
    dominantErrorType: string | null
    wordCount: number
    words: RemediationWordEntry[]
}

export function useGenerateRemediationMaterialMutation(teacherId: string | undefined) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (args: GenerateRemediationMaterialArgs) => {
            if (!teacherId) throw new Error('Missing teacher id')
            const { error } = await supabase.from('remediation_materials').insert({
                attempt_id: args.attemptId,
                student_id: args.studentId,
                teacher_id: teacherId,
                language: args.language,
                passage_title: args.passageTitle,
                dominant_error_type: args.dominantErrorType,
                word_count: args.wordCount,
                words: args.words,
            })
            if (error) throw error
            return { studentId: args.studentId }
        },
        onSuccess: ({ studentId }) => {
            void queryClient.invalidateQueries({ queryKey: remediationStudentsKey(teacherId) })
            void queryClient.invalidateQueries({ queryKey: remediationMaterialsKey(studentId) })
        },
    })
}

export function useDeleteRemediationMaterialMutation(teacherId: string | undefined) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, studentId }: { id: string; studentId: string }) => {
            const { error } = await supabase.from('remediation_materials').delete().eq('id', id)
            if (error) throw error
            return { studentId }
        },
        onSuccess: ({ studentId }) => {
            void queryClient.invalidateQueries({ queryKey: remediationStudentsKey(teacherId) })
            void queryClient.invalidateQueries({ queryKey: remediationMaterialsKey(studentId) })
        },
    })
}

// Persists a remediation session's progress — the full (possibly
// partially-toggled) words array, plus last_practiced_at = now(). Called
// by RemediationSession.tsx every time a word's practiced toggle
// changes (immediate persistence, no separate "save" step — see that
// file's own comment for why: nothing here is destructive enough to
// warrant a draft/confirm split like the review flow has, so the
// simplest thing is also the safest one). Writing the whole array back
// each time (rather than a narrower per-word update) is simplest given
// the jsonb column has no partial-update operator this client uses
// elsewhere.
//
// No teacherId parameter here (unlike the other mutations in this
// file): a progress update never changes anything keyed by teacherId —
// the students-with-remediation list sorts by created_at, which this
// mutation never touches — so there's nothing for it to invalidate.
export function useUpdateRemediationProgressMutation() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, studentId, words }: { id: string; studentId: string; words: RemediationWordEntry[] }) => {
            const nowIso = new Date().toISOString()
            const { error } = await supabase
                .from('remediation_materials')
                .update({ words, last_practiced_at: nowIso })
                .eq('id', id)
            if (error) throw error
            return { id, studentId }
        },
        onSuccess: ({ id, studentId }) => {
            void queryClient.invalidateQueries({ queryKey: remediationMaterialKey(id) })
            void queryClient.invalidateQueries({ queryKey: remediationMaterialsKey(studentId) })
        },
    })
}