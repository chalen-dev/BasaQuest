// File: src/pages/students/list/hooks.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabaseClient'
import { EMPTY_NAME, namePartsToColumns, type NameParts } from '../../../helpers/personName'

export type StudentRow = {
    id: string
    username: string | null
    full_name: string | null
    first_name: string | null
    middle_initial: string | null
    last_name: string | null
    suffix: string | null
    grade_level: number | null
    section: string | null
    is_non_reader: boolean
    is_disabled: boolean
}

export type CreateStudentPayload = {
    username: string
    name: NameParts
    password: string
    gradeLevel: number | null
    section: string | null
    isNonReader: boolean
}

export type UpdateStudentPayload = {
    id: string
    name: NameParts
    grade_level: number | null
    section: string | null
    is_non_reader: boolean
}

export type SortOption = 'name_asc' | 'name_desc' | 'grade_asc' | 'grade_desc'

// '' = all reader types, 'reader' = is_non_reader false, 'non_reader' = is_non_reader true
export type ReaderFilter = '' | 'reader' | 'non_reader'

// 'enabled' is the default (hide disabled accounts unless asked), 'disabled'
// shows only disabled accounts, 'all' shows both.
export type StatusFilter = 'enabled' | 'disabled' | 'all'

// '' = don't care, 'online' = currently-present pupils only, 'offline' =
// everyone NOT currently present. "Online" isn't a database column — it
// comes from the teacher's live presence subscription (useTeacherPresence)
// and gets passed into the query as a plain list of IDs, filtered
// server-side via .in()/.not() so pagination and the total count stay
// correct instead of a client-side filter silently shrinking a page.
export type OnlineFilter = '' | 'online' | 'offline'

export const PAGE_SIZE = 6

// Lives here (not in StudentAccountDrawer.tsx) because Vite Fast Refresh requires
// files that export a React component to export *only* components —
// mixing in a plain type/constant like this trips the
// react-refresh/only-export-components rule. hooks.ts is already the
// shared non-component file for this feature.
export type FormState = {
    username: string
    name: NameParts
    password: string
    gradeLevel: string
    section: string
    isNonReader: boolean
}

export const EMPTY_FORM: FormState = {
    username: '',
    name: EMPTY_NAME,
    password: '',
    gradeLevel: '',
    section: '',
    isNonReader: false,
}

type StudentsQueryArgs = {
    teacherId: string | undefined
    page: number
    search: string
    sort: SortOption
    gradeFilter: string // '' = all grades, otherwise '1'..'6'
    readerFilter: ReaderFilter
    statusFilter: StatusFilter
    onlineFilter: OnlineFilter
    onlineIds: string[]
}

const studentsKey = (teacherId: string | undefined) => ['students', teacherId] as const

export function useStudentsQuery({ teacherId, page, search, sort, gradeFilter, readerFilter, statusFilter, onlineFilter, onlineIds }: StudentsQueryArgs) {
    // Only feed the actual id list into the query key when the online
    // filter is in use — otherwise presence syncing (which fires on every
    // join/leave) would trigger a students refetch even though the filter
    // isn't active and the result can't possibly change.
    const onlineIdsKey = onlineFilter ? [...onlineIds].sort().join(',') : ''

    return useQuery({
        queryKey: [...studentsKey(teacherId), page, search, sort, gradeFilter, readerFilter, statusFilter, onlineFilter, onlineIdsKey],
        queryFn: async () => {
            // Online filter needs actual IDs to filter by — resolve these
            // "trivial" cases before even hitting the database.
            if (onlineFilter === 'online' && onlineIds.length === 0) {
                return { students: [], total: 0 }
            }

            const from = page * PAGE_SIZE
            const to = from + PAGE_SIZE - 1

            const primarySort: { column: 'last_name' | 'grade_level'; ascending: boolean } =
                sort === 'grade_asc'
                    ? { column: 'grade_level', ascending: true }
                    : sort === 'grade_desc'
                        ? { column: 'grade_level', ascending: false }
                        : sort === 'name_desc'
                            ? { column: 'last_name', ascending: false }
                            : { column: 'last_name', ascending: true }

            let query = supabase
                .from('profiles')
                .select('id, username, full_name, first_name, middle_initial, last_name, suffix, grade_level, section, is_non_reader, is_disabled', { count: 'exact' })
                .eq('teacher_id', teacherId as string)
                .eq('role', 'student')

            if (gradeFilter) {
                query = query.eq('grade_level', Number(gradeFilter))
            }

            if (readerFilter === 'reader') {
                query = query.eq('is_non_reader', false)
            } else if (readerFilter === 'non_reader') {
                query = query.eq('is_non_reader', true)
            }

            if (statusFilter === 'enabled') {
                query = query.eq('is_disabled', false)
            } else if (statusFilter === 'disabled') {
                query = query.eq('is_disabled', true)
            }
            // statusFilter === 'all' → no filter, show both

            if (onlineFilter === 'online') {
                query = query.in('id', onlineIds)
            } else if (onlineFilter === 'offline' && onlineIds.length > 0) {
                query = query.not('id', 'in', `(${onlineIds.join(',')})`)
            }
            // onlineFilter === 'offline' with an empty onlineIds list needs
            // no filter at all — nobody's online, so everyone qualifies.

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
                .order('first_name', { ascending: true })
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
                    fullName: namePartsToColumns(payload.name).full_name ?? '',
                    password: payload.password,
                    gradeLevel: payload.gradeLevel,
                    section: payload.section,
                    isNonReader: payload.isNonReader,
                },
            })
            if (error) throw error
            if (data?.error) throw new Error(data.error)
            // The function only knows the combined name; store the parts too so
            // the roster can sort by last name.
            const id = data?.profile?.id as string | undefined
            if (id) {
                const { full_name: _full, ...parts } = namePartsToColumns(payload.name)
                void _full
                const { error: partsErr } = await supabase.from('profiles').update(parts).eq('id', id)
                if (partsErr) throw partsErr
            }
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
        mutationFn: async ({ id, name, ...payload }: UpdateStudentPayload) => {
            const { error } = await supabase.from('profiles').update({ ...payload, ...namePartsToColumns(name) }).eq('id', id)
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

export function useToggleStudentStatusMutation(teacherId: string | undefined) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, disabled }: { id: string; disabled: boolean }) => {
            const { data, error } = await supabase.functions.invoke('toggle-student-status', {
                body: { id, disabled },
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

export function useForceLogoutStudentMutation(teacherId: string | undefined) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, online }: { id: string; online: boolean }) => {
            const { data, error } = await supabase.functions.invoke('force-logout-student', {
                body: { id, online },
            })
            if (error) throw error
            if (data?.error) throw new Error(data.error)
            return data as { success: boolean; banned: boolean }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: studentsKey(teacherId) })
        },
    })
}