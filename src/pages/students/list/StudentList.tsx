// File: StudentList.tsx
// File: src/pages/students/list/StudentList.tsx
import React, { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { useLang } from '../../../contexts/LangContext'
import { useTheme } from '../../../contexts/ThemeContext'
import { useProfile } from '../../../hooks/useProfile'
import { useTeacherPresence } from '../../../hooks/useTeacherPresence'
import { Pagination } from '../../../components/ui/Pagination'
import { Skeleton } from '../../../components/ui/Skeleton'
import { showConfirmation, showToast } from '../../../helpers/swalHelpers'
import type { Lang } from '../../../components/buttons/LangToggle'
import { StudentsSubNav } from '../components/StudentsSubNav'
import { StudentFilters } from './features/StudentFilters.tsx'
import { StudentForm } from './features/StudentForm.tsx'
import { StudentRow } from './features/StudentRow.tsx'
import {
    PAGE_SIZE,
    EMPTY_FORM,
    useCreateStudentMutation,
    useDeleteStudentMutation,
    useForceLogoutStudentMutation,
    useStudentsQuery,
    useToggleStudentStatusMutation,
    useUpdateStudentMutation,
    type OnlineFilter,
    type ReaderFilter,
    type SortOption,
    type StatusFilter,
    type FormState,
    type StudentRow as StudentRowData,
} from './hooks'
const STRINGS: Record<Lang, {
    title: string
    subtitle: string
    addButton: string
    loading: string
    emptyTitle: string
    emptyDesc: string
    noResultsTitle: string
    noResultsDesc: string
    searchLabel: string
    searchPlaceholder: string
    sortLabel: string
    sortNameAsc: string
    sortNameDesc: string
    sortGradeAsc: string
    sortGradeDesc: string
    gradeFilterLabel: string
    gradeFilterAll: string
    readerFilterLabel: string
    readerFilterAll: string
    readerFilterReaders: string
    readerFilterNonReaders: string
    statusFilterLabel: string
    statusFilterEnabled: string
    statusFilterDisabled: string
    statusFilterAll: string
    onlineFilterLabel: string
    onlineFilterAll: string
    onlineFilterOnline: string
    onlineFilterOffline: string
    resultsCount: (n: number) => string
    gradeLabel: (n: number) => string
    nonReader: string
    noSection: string
    formCreateTitle: string
    formEditTitle: string
    formCreateSubtitle: string
    formEditSubtitle: string
    fieldUsername: string
    fieldFullName: string
    fieldPassword: string
    fieldGrade: string
    fieldSection: string
    fieldNonReader: string
    cancel: string
    create: string
    creating: string
    save: string
    saving: string
    createdToast: string
    updatedToast: string
    editNote: string
    errorGeneric: string
    editAria: string
    deleteAria: string
    deleteConfirmTitle: string
    deleteConfirmText: (name: string) => string
    deleteConfirmButton: string
    deletedToast: string
    deleteErrorGeneric: string
    disableAria: string
    enableAria: string
    disabledBadge: string
    disableConfirmTitle: string
    disableConfirmText: (name: string) => string
    disableConfirmButton: string
    disabledToast: string
    enabledToast: string
    toggleErrorGeneric: string
    quickEnable: string
    quickDisable: string
    quickDelete: string
    quickForceLogout: string
    onlineLabel: string
    offlineLabel: string
    forceLogoutAria: string
    forceLogoutConfirmTitle: string
    forceLogoutConfirmText: (name: string) => string
    forceLogoutConfirmButton: string
    forceLogoutOnlineToast: string
    forceLogoutOfflineToast: string
    forceLogoutErrorGeneric: string
}> = {
    fil: {
        title: 'Listahan ng mga Estudyante',
        subtitle: 'Ang mga mag-aaral na nakatalaga sa iyo. Pumili ng entry para i-edit.',
        addButton: 'Magdagdag ng estudyante',
        loading: 'Kinukuha ang listahan...',
        emptyTitle: 'Wala ka pang estudyante.',
        emptyDesc: 'Gamitin ang form sa kanan para gumawa ng unang account.',
        noResultsTitle: 'Walang nahanap.',
        noResultsDesc: 'Subukan ang ibang keyword o filter.',
        searchLabel: 'Maghanap',
        searchPlaceholder: 'Pangalan o username...',
        sortLabel: 'Ayusin ayon sa',
        sortNameAsc: 'Pangalan (A–Z)',
        sortNameDesc: 'Pangalan (Z–A)',
        sortGradeAsc: 'Baitang (Mababa–Mataas)',
        sortGradeDesc: 'Baitang (Mataas–Mababa)',
        gradeFilterLabel: 'Baitang',
        gradeFilterAll: 'Lahat ng baitang',
        readerFilterLabel: 'Uri ng mambabasa',
        readerFilterAll: 'Lahat',
        readerFilterReaders: 'Mambabasa',
        readerFilterNonReaders: 'Non-reader',
        statusFilterLabel: 'Katayuan',
        statusFilterEnabled: 'Enabled',
        statusFilterDisabled: 'Disabled',
        statusFilterAll: 'Lahat',
        onlineFilterLabel: 'Presensya',
        onlineFilterAll: 'Lahat',
        onlineFilterOnline: 'Online',
        onlineFilterOffline: 'Offline',
        resultsCount: (n) => `${n} estudyante`,
        gradeLabel: (n) => `Baitang ${n}`,
        nonReader: 'Non-reader',
        noSection: 'Walang section',
        formCreateTitle: 'Bagong Estudyante',
        formEditTitle: 'I-edit ang Estudyante',
        formCreateSubtitle: 'Punan ang mga detalye para gumawa ng bagong account.',
        formEditSubtitle: 'Ina-edit mo ngayon ang detalye ng estudyanteng ito.',
        fieldUsername: 'Username',
        fieldFullName: 'Buong Pangalan',
        fieldPassword: 'Password',
        fieldGrade: 'Baitang',
        fieldSection: 'Section',
        fieldNonReader: 'Naka-flag bilang non-reader',
        cancel: 'Kanselahin',
        create: 'Gumawa',
        creating: 'Ginagawa...',
        save: 'I-save',
        saving: 'Sine-save...',
        createdToast: 'Nagawa ang account ng estudyante.',
        updatedToast: 'Na-update ang detalye ng estudyante.',
        editNote: 'Ang username at password ay hindi pa maaaring baguhin dito.',
        errorGeneric: 'May nangyaring mali. Subukan ulit.',
        editAria: 'I-edit',
        deleteAria: 'Burahin',
        deleteConfirmTitle: 'Burahin ang estudyanteng ito?',
        deleteConfirmText: (name) => `Permanenteng mabubura ang account ni ${name}. Hindi na ito maibabalik.`,
        deleteConfirmButton: 'Oo, burahin',
        deletedToast: 'Nabura ang account ng estudyante.',
        deleteErrorGeneric: 'Hindi nabura ang estudyante. Subukan ulit.',
        disableAria: 'I-disable ang account',
        enableAria: 'I-enable ang account',
        disabledBadge: 'Naka-disable',
        disableConfirmTitle: 'I-disable ang account na ito?',
        disableConfirmText: (name) => `Hindi na makaka-login si ${name} hangga't hindi mo ito ine-enable ulit.`,
        disableConfirmButton: 'Oo, i-disable',
        disabledToast: 'Na-disable ang account ng estudyante.',
        enabledToast: 'Na-enable muli ang account ng estudyante.',
        toggleErrorGeneric: 'Hindi na-update ang status ng account. Subukan ulit.',
        quickEnable: 'I-enable ang account',
        quickDisable: 'I-disable ang account',
        quickDelete: 'Burahin ang account',
        quickForceLogout: 'I-logout ang session',
        onlineLabel: 'Online',
        offlineLabel: 'Offline',
        forceLogoutAria: 'Puwersahang i-logout ang session',
        forceLogoutConfirmTitle: 'I-logout ang session ng estudyanteng ito?',
        forceLogoutConfirmText: (name) => `Ito ay magtatanggal sa kasalukuyang session ni ${name}. Kung hindi siya kasalukuyang online, i-di-disable muna ang account niya hanggang i-enable mo ulit.`,
        forceLogoutConfirmButton: 'Oo, i-logout',
        forceLogoutOnlineToast: 'Na-logout na ang estudyante sa kasalukuyang session niya.',
        forceLogoutOfflineToast: 'Hindi online ang estudyante — na-disable ang account bilang katiyakan. I-enable ulit kapag handa na.',
        forceLogoutErrorGeneric: 'Hindi na-logout ang estudyante. Subukan ulit.',
    },
    en: {
        title: 'Student List',
        subtitle: 'Pupils assigned to you. Select an entry to edit it.',
        addButton: 'Add student',
        loading: 'Loading students...',
        emptyTitle: "You don't have any students yet.",
        emptyDesc: 'Use the form on the right to create the first account.',
        noResultsTitle: 'No matches found.',
        noResultsDesc: 'Try a different search term or filter.',
        searchLabel: 'Search',
        searchPlaceholder: 'Name or username...',
        sortLabel: 'Sort by',
        sortNameAsc: 'Name (A–Z)',
        sortNameDesc: 'Name (Z–A)',
        sortGradeAsc: 'Grade (Low–High)',
        sortGradeDesc: 'Grade (High–Low)',
        gradeFilterLabel: 'Grade',
        gradeFilterAll: 'All grades',
        readerFilterLabel: 'Reader type',
        readerFilterAll: 'All',
        readerFilterReaders: 'Readers',
        readerFilterNonReaders: 'Non-readers',
        statusFilterLabel: 'Status',
        statusFilterEnabled: 'Enabled',
        statusFilterDisabled: 'Disabled',
        statusFilterAll: 'All',
        onlineFilterLabel: 'Presence',
        onlineFilterAll: 'All',
        onlineFilterOnline: 'Online',
        onlineFilterOffline: 'Offline',
        resultsCount: (n) => `${n} student${n === 1 ? '' : 's'}`,
        gradeLabel: (n) => `Grade ${n}`,
        nonReader: 'Non-reader',
        noSection: 'No section',
        formCreateTitle: 'New Student',
        formEditTitle: 'Edit Student',
        formCreateSubtitle: 'Fill in the details to create a new account.',
        formEditSubtitle: "You're editing this student's details.",
        fieldUsername: 'Username',
        fieldFullName: 'Full Name',
        fieldPassword: 'Password',
        fieldGrade: 'Grade level',
        fieldSection: 'Section',
        fieldNonReader: 'Flagged as non-reader',
        cancel: 'Cancel',
        create: 'Create',
        creating: 'Creating...',
        save: 'Save',
        saving: 'Saving...',
        createdToast: "Student's account was created.",
        updatedToast: "Student's details were updated.",
        editNote: "Username and password can't be changed here yet.",
        errorGeneric: 'Something went wrong. Please try again.',
        editAria: 'Edit',
        deleteAria: 'Delete',
        deleteConfirmTitle: 'Delete this student?',
        deleteConfirmText: (name) => `This will permanently delete ${name}'s account. This can't be undone.`,
        deleteConfirmButton: 'Yes, delete',
        deletedToast: "Student's account was deleted.",
        deleteErrorGeneric: "Couldn't delete this student. Please try again.",
        disableAria: 'Disable this account',
        enableAria: 'Enable this account',
        disabledBadge: 'Disabled',
        disableConfirmTitle: 'Disable this account?',
        disableConfirmText: (name) => `${name} won't be able to log in until you enable the account again.`,
        disableConfirmButton: 'Yes, disable',
        disabledToast: "Student's account was disabled.",
        enabledToast: "Student's account was enabled.",
        toggleErrorGeneric: "Couldn't update the account's status. Please try again.",
        quickEnable: 'Enable account',
        quickDisable: 'Disable account',
        quickDelete: 'Delete account',
        quickForceLogout: 'Force logout',
        onlineLabel: 'Online',
        offlineLabel: 'Offline',
        forceLogoutAria: 'Force-logout this session',
        forceLogoutConfirmTitle: 'Force-logout this student?',
        forceLogoutConfirmText: (name) => `This will end ${name}'s current session. If they're not currently online, their account will be disabled instead until you enable it again.`,
        forceLogoutConfirmButton: 'Yes, log them out',
        forceLogoutOnlineToast: "The student's active session was ended.",
        forceLogoutOfflineToast: "The student wasn't online — their account was disabled as a safeguard. Enable it again when ready.",
        forceLogoutErrorGeneric: "Couldn't log the student out. Please try again.",
    },
}
export const StudentList: React.FC = () => {
    const { lang } = useLang()
    const { theme } = useTheme()
    const { profile } = useProfile()
    const t = STRINGS[lang]
    const onlineIdsSet = useTeacherPresence(profile?.id)
    const onlineIds = Array.from(onlineIdsSet)
    const [editing, setEditing] = useState<StudentRowData | null>(null)
    const [form, setForm] = useState<FormState>(EMPTY_FORM)
    const [formError, setFormError] = useState('')
    const [formOpen, setFormOpen] = useState(false)
    const [searchInput, setSearchInput] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [sort, setSort] = useState<SortOption>('name_asc')
    const [gradeFilter, setGradeFilter] = useState('')
    // Defaults per how a teacher actually wants to see the roster day to
    // day: every reader type, but only accounts that can currently log
    // in — disabled pupils are hidden unless explicitly asked for.
    const [readerFilter, setReaderFilter] = useState<ReaderFilter>('')
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('enabled')
    const [onlineFilter, setOnlineFilter] = useState<OnlineFilter>('')
    const [page, setPage] = useState(0)
    // Debounce the search box so we're not firing a query on every
    // keystroke. The page-0 reset lives inside the setTimeout callback —
    // an actual deferred async callback, not a synchronous effect body —
    // so it doesn't trip the react-hooks/set-state-in-effect lint rule.
    useEffect(() => {
        const handle = setTimeout(() => {
            setDebouncedSearch(searchInput.trim())
            setPage(0)
        }, 300)
        return () => clearTimeout(handle)
    }, [searchInput])
    const {
        data,
        isLoading,
        isFetching,
        error,
    } = useStudentsQuery({ teacherId: profile?.id, page, search: debouncedSearch, sort, gradeFilter, readerFilter, statusFilter, onlineFilter, onlineIds })
    const students = data?.students ?? []
    const total = data?.total ?? 0
    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
    const hasFilters =
        debouncedSearch.length > 0 ||
        gradeFilter.length > 0 ||
        readerFilter.length > 0 ||
        statusFilter !== 'enabled' ||
        onlineFilter.length > 0
    const createMutation = useCreateStudentMutation(profile?.id)
    const updateMutation = useUpdateStudentMutation(profile?.id)
    const deleteMutation = useDeleteStudentMutation(profile?.id)
    const toggleStatusMutation = useToggleStudentStatusMutation(profile?.id)
    const forceLogoutMutation = useForceLogoutStudentMutation(profile?.id)
    const submitting = createMutation.isPending || updateMutation.isPending
    const openCreateForm = () => {
        setEditing(null)
        setForm(EMPTY_FORM)
        setFormError('')
        setFormOpen(true)
    }
    const openEditForm = (student: StudentRowData) => {
        setEditing(student)
        setForm({
            username: student.username ?? '',
            fullName: student.full_name ?? '',
            password: '',
            gradeLevel: student.grade_level != null ? String(student.grade_level) : '',
            section: student.section ?? '',
            isNonReader: student.is_non_reader,
        })
        setFormError('')
        setFormOpen(true)
    }
    const closeForm = () => {
        setFormOpen(false)
    }
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!profile?.id) return
        setFormError('')
        try {
            if (editing) {
                await updateMutation.mutateAsync({
                    id: editing.id,
                    full_name: form.fullName,
                    grade_level: form.gradeLevel ? Number(form.gradeLevel) : null,
                    section: form.section || null,
                    is_non_reader: form.isNonReader,
                })
                showToast(t.updatedToast, 'success', theme === 'dark')
            } else {
                await createMutation.mutateAsync({
                    username: form.username,
                    fullName: form.fullName,
                    password: form.password,
                    gradeLevel: form.gradeLevel ? Number(form.gradeLevel) : null,
                    section: form.section || null,
                    isNonReader: form.isNonReader,
                })
                showToast(t.createdToast, 'success', theme === 'dark')
                // A new pupil might land on a different page/search/filter
                // combo than the one we're currently viewing — jump back to
                // a clean, unfiltered view.
                setSearchInput('')
                setGradeFilter('')
                setPage(0)
            }
            setFormOpen(false)
        } catch (err) {
            setFormError(err instanceof Error ? err.message : t.errorGeneric)
        }
    }
    const handleDelete = async (student: StudentRowData, e: React.MouseEvent) => {
        e.stopPropagation()
        const displayName = student.full_name || student.username || ''
        const confirmed = await showConfirmation(
            t.deleteConfirmTitle,
            t.deleteConfirmText(displayName),
            theme === 'dark',
            'warning',
            t.deleteConfirmButton
        )
        if (!confirmed) return
        try {
            await deleteMutation.mutateAsync(student.id)
            showToast(t.deletedToast, 'success', theme === 'dark')
            if (editing?.id === student.id) {
                setFormOpen(false)
                setEditing(null)
            }
            // If that was the last row on this page, step back a page
            // instead of leaving the roster showing a blank page. Handled
            // here in the event handler (not a useEffect watching query
            // state) since we already know exactly when it matters.
            if (students.length === 1 && page > 0) {
                setPage((p) => p - 1)
            }
        } catch (err) {
            showToast(err instanceof Error ? err.message : t.deleteErrorGeneric, 'error', theme === 'dark')
        }
    }
    // Disabling asks for confirmation first (it blocks a kid from logging
    // in); enabling doesn't since it's just restoring access. If the
    // drawer is open on the same pupil, its snapshot is patched in place
    // so the quick-action button flips immediately instead of waiting on
    // the next roster refetch.
    const handleToggleStatus = async (student: StudentRowData, e: React.MouseEvent) => {
        e.stopPropagation()
        const nextDisabled = !student.is_disabled
        if (nextDisabled) {
            const displayName = student.full_name || student.username || ''
            const confirmed = await showConfirmation(
                t.disableConfirmTitle,
                t.disableConfirmText(displayName),
                theme === 'dark',
                'warning',
                t.disableConfirmButton
            )
            if (!confirmed) return
        }
        try {
            await toggleStatusMutation.mutateAsync({ id: student.id, disabled: nextDisabled })
            showToast(nextDisabled ? t.disabledToast : t.enabledToast, 'success', theme === 'dark')
            if (editing?.id === student.id) {
                setEditing((prev) => (prev ? { ...prev, is_disabled: nextDisabled } : prev))
            }
        } catch (err) {
            showToast(err instanceof Error ? err.message : t.toggleErrorGeneric, 'error', theme === 'dark')
        }
    }
    // Ends the pupil's current session. If they're currently online (per
    // the teacher's own presence subscription), this is a realtime kick —
    // instant, and they can log back in right away. If they're not online,
    // it falls back to disabling the account outright as a guarantee,
    // since there's no live tab to actually reach.
    const handleForceLogout = async (student: StudentRowData, e: React.MouseEvent) => {
        e.stopPropagation()
        const displayName = student.full_name || student.username || ''
        const confirmed = await showConfirmation(
            t.forceLogoutConfirmTitle,
            t.forceLogoutConfirmText(displayName),
            theme === 'dark',
            'warning',
            t.forceLogoutConfirmButton
        )
        if (!confirmed) return
        const wasOnline = onlineIdsSet.has(student.id)
        try {
            const result = await forceLogoutMutation.mutateAsync({ id: student.id, online: wasOnline })
            showToast(result.banned ? t.forceLogoutOfflineToast : t.forceLogoutOnlineToast, 'success', theme === 'dark')
            if (result.banned && editing?.id === student.id) {
                setEditing((prev) => (prev ? { ...prev, is_disabled: true } : prev))
            }
        } catch (err) {
            showToast(err instanceof Error ? err.message : t.forceLogoutErrorGeneric, 'error', theme === 'dark')
        }
    }
    const showEmptyRoster = !isLoading && !error && total === 0 && !hasFilters
    const showNoResults = !isLoading && !error && total === 0 && hasFilters
    return (
        <div className="mx-auto max-w-6xl px-4 pb-12 pt-2">
            <StudentsSubNav />
            {/* Header card — same layered gradient treatment as Home's hero
                (light cream/amber-glow, dark navy/teal-glow) instead of a
                flat solid panel, for consistency with Home/Dashboard/
                MaterialSelection. Title/subtitle + search/sort/filter sit
                on the relative-positioned content layer above the
                gradient/glow layers. */}
            <section className="relative mb-6 overflow-hidden rounded-3xl border border-gray-900/5 p-5 shadow-sm transition-colors duration-300 dark:border-gray-100/10 sm:p-6">
                <div
                    className="absolute inset-0 dark:hidden"
                    style={{ background: 'linear-gradient(180deg, #fffdf8 0%, #fff3dd 100%)' }}
                />
                <div
                    className="absolute inset-0 hidden dark:block"
                    style={{ background: 'linear-gradient(180deg, #0f172a 0%, #020617 100%)' }}
                />
                <div
                    className="pointer-events-none absolute inset-0 dark:hidden"
                    style={{ background: 'radial-gradient(circle at 88% -20%, rgba(255,198,75,0.4), transparent 55%)' }}
                />
                <div
                    className="pointer-events-none absolute inset-0 hidden dark:block"
                    style={{ background: 'radial-gradient(circle at 88% -20%, rgba(45,212,191,0.28), transparent 55%)' }}
                />
                <div className="relative">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-50">{t.title}</h1>
                            <p className="mt-1 text-sm font-medium text-gray-600 dark:text-gray-300">{t.subtitle}</p>
                        </div>
                        <button
                            onClick={openCreateForm}
                            className="flex w-fit cursor-pointer items-center gap-1.5 rounded-full bg-teal-500 px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_0_0_#0f766e] transition-[transform,box-shadow] duration-150 active:translate-y-1 active:shadow-[0_1px_0_0_#0f766e] dark:bg-teal-600 dark:shadow-[0_4px_0_0_#115e59]"
                        >
                            <Plus size={16} />
                            {t.addButton}
                        </button>
                    </div>
                    <div className="mt-5">
                        <StudentFilters
                            t={t}
                            searchInput={searchInput}
                            onSearchChange={setSearchInput}
                            sort={sort}
                            onSortChange={(value) => {
                                setSort(value)
                                setPage(0)
                            }}
                            gradeFilter={gradeFilter}
                            onGradeFilterChange={(value) => {
                                setGradeFilter(value)
                                setPage(0)
                            }}
                            readerFilter={readerFilter}
                            onReaderFilterChange={(value) => {
                                setReaderFilter(value)
                                setPage(0)
                            }}
                            statusFilter={statusFilter}
                            onStatusFilterChange={(value) => {
                                setStatusFilter(value)
                                setPage(0)
                            }}
                            onlineFilter={onlineFilter}
                            onOnlineFilterChange={(value) => {
                                setOnlineFilter(value)
                                setPage(0)
                            }}
                        />
                    </div>
                    {!isLoading && !error && total > 0 && (
                        <div className="mt-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400">
                            {t.resultsCount(total)}
                        </div>
                    )}
                </div>
            </section>
            {/* Roster — full width now that the add/edit form lives in a
                drawer instead of a permanently-docked side column. */}
            <div>
                {isLoading ? (
                    <div className="flex flex-col gap-3" role="status" aria-busy="true">
                        <span className="sr-only">{t.loading}</span>
                        {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                            <div
                                key={i}
                                style={{ borderLeftColor: 'rgba(148,163,184,0.4)', borderLeftWidth: 6 }}
                                className="flex w-full items-center gap-4 rounded-2xl border-2 border-gray-900/5 bg-white p-4 dark:border-gray-100/10 dark:bg-gray-900"
                            >
                                <Skeleton className="h-11 w-11 shrink-0 rounded-2xl" />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-4 w-16 rounded-full" />
                                        <Skeleton className="h-4 w-14 rounded-full" />
                                    </div>
                                    <Skeleton className="mt-2 h-3 w-40" />
                                </div>
                                <div className="flex shrink-0 items-center gap-1.5">
                                    <Skeleton className="h-9 w-9 rounded-xl" />
                                    <Skeleton className="h-9 w-9 rounded-xl" />
                                    <Skeleton className="h-9 w-9 rounded-xl" />
                                    <Skeleton className="h-9 w-9 rounded-xl" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                        {error instanceof Error ? error.message : t.errorGeneric}
                    </div>
                ) : showEmptyRoster ? (
                    <div className="rounded-2xl border-2 border-dashed border-gray-900/10 bg-white p-10 text-center dark:border-gray-100/10 dark:bg-gray-900">
                        <p className="text-base font-extrabold text-gray-900 dark:text-gray-50">{t.emptyTitle}</p>
                        <p className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-300">{t.emptyDesc}</p>
                    </div>
                ) : showNoResults ? (
                    <div className="rounded-2xl border-2 border-dashed border-gray-900/10 bg-white p-10 text-center dark:border-gray-100/10 dark:bg-gray-900">
                        <p className="text-base font-extrabold text-gray-900 dark:text-gray-50">{t.noResultsTitle}</p>
                        <p className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-300">{t.noResultsDesc}</p>
                    </div>
                ) : (
                    <div className={`flex flex-col gap-3 transition-opacity duration-150 ${isFetching ? 'opacity-60' : ''}`}>
                        {students.map((student) => (
                            <StudentRow
                                key={student.id}
                                student={student}
                                isSelected={formOpen && editing?.id === student.id}
                                isDeleting={deleteMutation.isPending && deleteMutation.variables === student.id}
                                isTogglingStatus={toggleStatusMutation.isPending && toggleStatusMutation.variables?.id === student.id}
                                isOnline={onlineIdsSet.has(student.id)}
                                isForcingLogout={forceLogoutMutation.isPending && forceLogoutMutation.variables?.id === student.id}
                                t={t}
                                onSelect={() => openEditForm(student)}
                                onEdit={() => openEditForm(student)}
                                onDelete={(e) => handleDelete(student, e)}
                                onToggleStatus={(e) => handleToggleStatus(student, e)}
                                onForceLogout={(e) => handleForceLogout(student, e)}
                            />
                        ))}
                    </div>
                )}
                <Pagination page={page} pageCount={pageCount} onPageChange={setPage} className="mt-5" />
            </div>
            <StudentForm
                t={t}
                open={formOpen}
                editing={editing}
                form={form}
                setForm={setForm}
                formError={formError}
                submitting={submitting}
                onSubmit={handleSubmit}
                onClose={closeForm}
                onToggleStatus={(e) => editing && handleToggleStatus(editing, e)}
                onDelete={(e) => editing && handleDelete(editing, e)}
                onForceLogout={(e) => editing && handleForceLogout(editing, e)}
                isTogglingStatus={editing ? toggleStatusMutation.isPending && toggleStatusMutation.variables?.id === editing.id : false}
                isDeleting={editing ? deleteMutation.isPending && deleteMutation.variables === editing.id : false}
                isForcingLogout={editing ? forceLogoutMutation.isPending && forceLogoutMutation.variables?.id === editing.id : false}
                isOnline={editing ? onlineIdsSet.has(editing.id) : false}
            />
        </div>
    )
}
export default StudentList