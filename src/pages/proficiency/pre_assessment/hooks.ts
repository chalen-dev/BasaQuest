// File: src/pages/proficiency/pre_assessment/hooks.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabaseClient'
import type { Lang } from '../../../components/buttons/LangToggle'

export type AssignableStudent = {
    id: string
    full_name: string | null
    username: string | null
    grade_level: number | null
    is_non_reader: boolean
    pendingAssignment: { id: string; lang: Lang } | null
}

export type AssignableOnlineFilter = '' | 'online' | 'offline'
export type AssignableReaderFilter = '' | 'reader' | 'non_reader'

export const ASSIGNABLE_PAGE_SIZE = 10

const assignableStudentsKey = (teacherId: string | undefined) => ['assignable-students', teacherId] as const

type AssignableStudentsQueryArgs = {
    teacherId: string | undefined
    page: number
    search: string
    gradeFilter: string
    readerFilter: AssignableReaderFilter
    onlineFilter: AssignableOnlineFilter
    onlineIds: string[]
}

export function useAssignableStudentsQuery({ teacherId, page, search, gradeFilter, readerFilter, onlineFilter, onlineIds }: AssignableStudentsQueryArgs) {
    const onlineIdsKey = onlineFilter ? [...onlineIds].sort().join(',') : ''
    return useQuery({
        queryKey: [...assignableStudentsKey(teacherId), page, search, gradeFilter, readerFilter, onlineFilter, onlineIdsKey],
        queryFn: async () => {
            if (onlineFilter === 'online' && onlineIds.length === 0) {
                return { students: [] as AssignableStudent[], total: 0 }
            }
            const from = page * ASSIGNABLE_PAGE_SIZE
            const to = from + ASSIGNABLE_PAGE_SIZE - 1

            let query = supabase
                .from('profiles')
                .select('id, full_name, username, grade_level, is_non_reader', { count: 'exact' })
                .eq('teacher_id', teacherId as string)
                .eq('role', 'student')
                .eq('is_disabled', false)

            if (gradeFilter) {
                query = query.eq('grade_level', Number(gradeFilter))
            }
            if (readerFilter === 'reader') {
                query = query.eq('is_non_reader', false)
            } else if (readerFilter === 'non_reader') {
                query = query.eq('is_non_reader', true)
            }
            if (onlineFilter === 'online') {
                query = query.in('id', onlineIds)
            } else if (onlineFilter === 'offline' && onlineIds.length > 0) {
                query = query.not('id', 'in', `(${onlineIds.join(',')})`)
            }

            const trimmed = search.trim()
            if (trimmed) {
                const escaped = trimmed.replace(/[%,]/g, '')
                query = query.or(`full_name.ilike.%${escaped}%,username.ilike.%${escaped}%`)
            }

            query = query.order('full_name', { ascending: true }).range(from, to)

            const { data: students, error, count } = await query
            if (error) throw error

            const { data: pending, error: pendingError } = await supabase
                .from('assigned_assessments')
                .select('id, student_id, lang')
                .eq('teacher_id', teacherId as string)
            if (pendingError) throw pendingError

            const pendingByStudent = new Map(
                (pending ?? []).map((p) => [p.student_id, { id: p.id as string, lang: p.lang as Lang }])
            )

            const withPending = (students ?? []).map((s) => ({
                ...s,
                pendingAssignment: pendingByStudent.get(s.id) ?? null,
            })) as AssignableStudent[]

            return { students: withPending, total: count ?? 0 }
        },
        enabled: !!teacherId,
        placeholderData: (prev) => prev,
    })
}

export function useAssignAssessmentMutation(teacherId: string | undefined) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ studentId, lang }: { studentId: string; lang: Lang }) => {
            const { error } = await supabase.from('assigned_assessments').insert({
                teacher_id: teacherId,
                student_id: studentId,
                lang,
            })
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: assignableStudentsKey(teacherId) })
        },
    })
}

export function useCancelAssignedAssessmentMutation(teacherId: string | undefined) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (assignmentId: string) => {
            const { error } = await supabase.from('assigned_assessments').delete().eq('id', assignmentId)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: assignableStudentsKey(teacherId) })
        },
    })
}