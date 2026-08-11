// File: src/pages/students/list/hooks.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabaseClient'

export type StudentRow = {
    id: string
    username: string | null
    full_name: string | null
    grade_level: number | null
    section: string | null
    is_non_reader: boolean
}

export type CreateStudentPayload = {
    username: string
    fullName: string
    password: string
    gradeLevel: number | null
    section: string | null
    isNonReader: boolean
}

export type UpdateStudentPayload = {
    id: string
    full_name: string
    grade_level: number | null
    section: string | null
    is_non_reader: boolean
}

export type SortOption = 'name_asc' | 'name_desc' | 'grade_asc' | 'grade_desc'

export const PAGE_SIZE = 6

type StudentsQueryArgs = {
    teacherId: string | undefined
    page: number
    search: string
    sort: SortOption
    gradeFilter: string // '' = all grades, otherwise '1'..'6'
}

const studentsKey = (teacherId: string | undefined) => ['students', teacherId] as const

export function useStudentsQuery({ teacherId, page, search, sort, gradeFilter }: StudentsQueryArgs) {
    return useQuery({
        queryKey: [...studentsKey(teacherId), page, search, sort, gradeFilter],
        queryFn: async () => {
            const from = page * PAGE_SIZE
            const to = from + PAGE_SIZE - 1

            const primarySort: { column: 'full_name' | 'grade_level'; ascending: boolean } =
                sort === 'grade_asc'
                    ? { column: 'grade_level', ascending: true }
                    : sort === 'grade_desc'
                        ? { column: 'grade_level', ascending: false }
                        : sort === 'name_desc'
                            ? { column: 'full_name', ascending: false }
                            : { column: 'full_name', ascending: true }

            let query = supabase
                .from('profiles')
                .select('id, username, full_name, grade_level, section, is_non_reader', { count: 'exact' })
                .eq('teacher_id', teacherId as string)
                .eq('role', 'student')

            if (gradeFilter) {
                query = query.eq('grade_level', Number(gradeFilter))
            }

            const trimmed = search.trim()
            if (trimmed) {
                const escaped = trimmed.replace(/[%,]/g, '')
                query = query.or(`full_name.ilike.%${escaped}%,username.ilike.%${escaped}%`)
            }

            // Secondary sort by name keeps ordering stable (no reshuffling
            // between pages) when the primary sort is by grade, where ties
            // are common.
            query = query
                .order(primarySort.column, { ascending: primarySort.ascending, nullsFirst: false })
                .order('full_name', { ascending: true })
                .range(from, to)

            const { data, error, count } = await query
            if (error) throw error
            return { students: (data ?? []) as StudentRow[], total: count ?? 0 }
        },
        enabled: !!teacherId,
        placeholderData: (prev) => prev,
    })
}

export function useCreateStudentMutation(teacherId: string | undefined) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (payload: CreateStudentPayload) => {
            const { data, error } = await supabase.functions.invoke('create-student', {
                body: {
                    username: payload.username,
                    fullName: payload.fullName,
                    password: payload.password,
                    gradeLevel: payload.gradeLevel,
                    section: payload.section,
                    isNonReader: payload.isNonReader,
                },
            })
            if (error) throw error
            if (data?.error) throw new Error(data.error)
            return data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: studentsKey(teacherId) })
        },
    })
}

export function useUpdateStudentMutation(teacherId: string | undefined) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, ...payload }: UpdateStudentPayload) => {
            const { error } = await supabase.from('profiles').update(payload).eq('id', id)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: studentsKey(teacherId) })
        },
    })
}

export function useDeleteStudentMutation(teacherId: string | undefined) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (id: string) => {
            const { data, error } = await supabase.functions.invoke('delete-student', {
                body: { id },
            })
            if (error) throw error
            if (data?.error) throw new Error(data.error)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: studentsKey(teacherId) })
        },
    })
}