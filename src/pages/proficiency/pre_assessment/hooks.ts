// File: src/pages/proficiency/pre_assessment/hooks.ts
import { useEffect, useState } from 'react'
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

// Fetches an arbitrary student's profile by id, for the "Start Now"
// same-device flow — the teacher stays logged in as themselves, but the
// session needs to know the STUDENT's grade level / reader status, not
// the teacher's own. Shaped like useProfile()'s Profile type, just keyed
// by an explicit id instead of the current auth user.
//
// Relies on the existing "Users can view all profiles" RLS select policy
// (see 20260809092632_create_profiles_table.sql), which allows any
// authenticated user to read any profile row — same policy every other
// profile-by-id lookup in this app already depends on. This does mean a
// teacher could technically point ?studentId= at an id outside their own
// roster; since nothing writes anything yet (see AssessmentSession.tsx's
// own note that result-saving isn't built), the only consequence today is
// reading that student's name/grade/non-reader flag, not a security hole
// worth tightening right now — revisit once result-saving is added.
export type AssistedProfile = {
    id: string
    full_name: string | null
    username: string | null
    grade_level: number | null
    is_non_reader: boolean
}

export function useAssistedStudentProfile(studentId: string | null) {
    const [profile, setProfile] = useState<AssistedProfile | null>(null)
    const [loading, setLoading] = useState(!!studentId)

    useEffect(() => {
        if (!studentId) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setProfile(null)
            setLoading(false)
            return
        }
        let cancelled = false
        setLoading(true)
        supabase
            .from('profiles')
            .select('id, full_name, username, grade_level, is_non_reader')
            .eq('id', studentId)
            .single()
            .then(({ data, error }) => {
                if (cancelled) return
                if (error) {
                    console.error('useAssistedStudentProfile: failed to load profile', error)
                    setProfile(null)
                } else {
                    setProfile(data as AssistedProfile)
                }
                setLoading(false)
            })
        return () => {
            cancelled = true
        }
    }, [studentId])

    return { profile, loading }
}