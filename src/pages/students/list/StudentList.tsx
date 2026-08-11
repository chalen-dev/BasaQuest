import React, { useEffect, useState } from 'react'
import { Plus, UserRound, UserPlus, Pencil, Trash2 } from 'lucide-react'
import { useLang } from '../../../contexts/LangContext'
import { useTheme } from '../../../contexts/ThemeContext'
import { useProfile } from '../../../hooks/useProfile'
import { Text } from '../../../components/input/Text'
import { Password } from '../../../components/input/Password'
import { SearchInput } from '../../../components/input/SearchInput'
import { Select } from '../../../components/input/Select'
import { Pagination } from '../../../components/ui/Pagination'
import { showConfirmation, showToast } from '../../../helpers/swalHelpers'
import type { Lang } from '../../../components/buttons/LangToggle'
import { StudentsSubNav } from '../components/StudentsSubNav'
import {
    PAGE_SIZE,
    useCreateStudentMutation,
    useDeleteStudentMutation,
    useStudentsQuery,
    useUpdateStudentMutation,
    type SortOption,
    type StudentRow,
} from './hooks'

type FormState = {
    username: string
    fullName: string
    password: string
    gradeLevel: string
    section: string
    isNonReader: boolean
}

const EMPTY_FORM: FormState = {
    username: '',
    fullName: '',
    password: '',
    gradeLevel: '',
    section: '',
    isNonReader: false,
}

const GRADE_OPTIONS = [1, 2, 3, 4, 5, 6]

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
    },
}

export const StudentList: React.FC = () => {
    const { lang } = useLang()
    const { theme } = useTheme()
    const { profile } = useProfile()
    const t = STRINGS[lang]

    const [editing, setEditing] = useState<StudentRow | null>(null)
    const [form, setForm] = useState<FormState>(EMPTY_FORM)
    const [formError, setFormError] = useState('')

    const [searchInput, setSearchInput] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [sort, setSort] = useState<SortOption>('name_asc')
    const [gradeFilter, setGradeFilter] = useState('')
    const [page, setPage] = useState(0)

    const sortOptions = [
        { value: 'name_asc', label: t.sortNameAsc },
        { value: 'name_desc', label: t.sortNameDesc },
        { value: 'grade_asc', label: t.sortGradeAsc },
        { value: 'grade_desc', label: t.sortGradeDesc },
    ]
    const gradeFilterOptions = [
        { value: '', label: t.gradeFilterAll },
        ...GRADE_OPTIONS.map((n) => ({ value: String(n), label: t.gradeLabel(n) })),
    ]

    // Debounce the search box so we're not firing a query on every keystroke.
    useEffect(() => {
        const handle = setTimeout(() => setDebouncedSearch(searchInput.trim()), 300)
        return () => clearTimeout(handle)
    }, [searchInput])

    // Any time the (debounced) search term or a filter/sort changes, jump
    // back to page 1 so we're not stranded on an out-of-range page.
    useEffect(() => {
        setPage(0)
    }, [debouncedSearch, sort, gradeFilter])

    const {
        data,
        isLoading,
        isFetching,
        error,
    } = useStudentsQuery({ teacherId: profile?.id, page, search: debouncedSearch, sort, gradeFilter })

    const students = data?.students ?? []
    const total = data?.total ?? 0
    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
    const hasFilters = debouncedSearch.length > 0 || gradeFilter.length > 0

    // If a delete (or a search/filter) empties out the current page, step
    // back a page instead of showing a dangling blank page.
    useEffect(() => {
        if (!isFetching && students.length === 0 && page > 0) {
            setPage((p) => p - 1)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [students.length, isFetching, page])

    const createMutation = useCreateStudentMutation(profile?.id)
    const updateMutation = useUpdateStudentMutation(profile?.id)
    const deleteMutation = useDeleteStudentMutation(profile?.id)
    const submitting = createMutation.isPending || updateMutation.isPending

    const resetToCreate = () => {
        setEditing(null)
        setForm(EMPTY_FORM)
        setFormError('')
    }

    const selectForEdit = (student: StudentRow) => {
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
            resetToCreate()
        } catch (err) {
            setFormError(err instanceof Error ? err.message : t.errorGeneric)
        }
    }

    const handleDelete = async (student: StudentRow, e: React.MouseEvent) => {
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
            if (editing?.id === student.id) resetToCreate()
        } catch (err) {
            showToast(err instanceof Error ? err.message : t.deleteErrorGeneric, 'error', theme === 'dark')
        }
    }

    const showEmptyRoster = !isLoading && !error && total === 0 && !hasFilters
    const showNoResults = !isLoading && !error && total === 0 && hasFilters

    return (
        <div className="mx-auto max-w-6xl px-4 pb-12 pt-2">

            <StudentsSubNav />

            {/* Header card — title/subtitle + search/sort/filter now live on a
                solid panel instead of floating directly over the night-sky
                backdrop, where the muted gray text was hard to read. */}
            <div className="mb-6 rounded-3xl border border-gray-900/5 bg-white p-5 shadow-sm dark:border-gray-100/10 dark:bg-gray-900">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-50">{t.title}</h1>
                        <p className="mt-1 text-sm font-medium text-gray-600 dark:text-gray-300">{t.subtitle}</p>
                    </div>
                    <button
                        onClick={resetToCreate}
                        className="flex w-fit items-center gap-1.5 rounded-full bg-teal-500 px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_0_0_#0f766e] transition-[transform,box-shadow] duration-150 active:translate-y-1 active:shadow-[0_1px_0_0_#0f766e] dark:bg-teal-600 dark:shadow-[0_4px_0_0_#115e59]"
                    >
                        <Plus size={16} />
                        {t.addButton}
                    </button>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
                    <SearchInput
                        value={searchInput}
                        onChange={setSearchInput}
                        label={t.searchLabel}
                        placeholder={t.searchPlaceholder}
                    />
                    <Select
                        name="sort"
                        label={t.sortLabel}
                        options={sortOptions}
                        value={sort}
                        onChange={(e) => setSort(e.target.value as SortOption)}
                        selectClassName="px-3.5 py-3 pr-9"
                        className="min-w-[190px]"
                    />
                    <Select
                        name="gradeFilter"
                        label={t.gradeFilterLabel}
                        options={gradeFilterOptions}
                        value={gradeFilter}
                        onChange={(e) => setGradeFilter(e.target.value)}
                        selectClassName="px-3.5 py-3 pr-9"
                        className="min-w-[150px]"
                    />
                </div>

                {!isLoading && !error && total > 0 && (
                    <div className="mt-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400">
                        {t.resultsCount(total)}
                    </div>
                )}
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_380px] lg:items-start">
                {/* Left — the roster */}
                <div>
                    {isLoading ? (
                        <div className="rounded-2xl border-2 border-gray-900/5 bg-white p-10 text-center text-sm font-bold text-gray-500 dark:border-gray-100/10 dark:bg-gray-900 dark:text-gray-400">
                            {t.loading}
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
                            {students.map((student) => {
                                const accent = student.is_non_reader ? '#f97316' : '#14b8a6'
                                const isSelected = editing?.id === student.id
                                const isDeleting = deleteMutation.isPending && deleteMutation.variables === student.id
                                return (
                                    <div
                                        key={student.id}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => selectForEdit(student)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') selectForEdit(student)
                                        }}
                                        style={{ borderLeftColor: accent, borderLeftWidth: 6 }}
                                        className={`group flex w-full cursor-pointer items-center gap-4 rounded-2xl border-2 bg-white p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:bg-gray-900 ${
                                            isSelected
                                                ? 'border-gray-900/20 ring-2 ring-teal-400/60 dark:border-gray-100/25'
                                                : 'border-gray-900/5 dark:border-gray-100/10'
                                        } ${isDeleting ? 'opacity-50' : ''}`}
                                    >
                                        <span
                                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-base font-extrabold"
                                            style={{ background: `${accent}22`, color: accent }}
                                        >
                                            {student.full_name?.[0]?.toUpperCase() ?? student.username?.[0]?.toUpperCase() ?? <UserRound size={18} />}
                                        </span>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-base font-extrabold text-gray-900 dark:text-gray-50">
                                                    {student.full_name || student.username}
                                                </span>
                                                {student.grade_level != null && (
                                                    <span className="rounded-full bg-gray-900/5 px-2.5 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-100/10 dark:text-gray-300">
                                                        {t.gradeLabel(student.grade_level)}
                                                    </span>
                                                )}
                                                {student.is_non_reader && (
                                                    <span className="rounded-full bg-orange-500/15 px-2.5 py-0.5 text-xs font-semibold text-orange-600 dark:text-orange-400">
                                                        {t.nonReader}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="mt-0.5 text-sm font-medium text-gray-500 dark:text-gray-300">
                                                @{student.username} · {student.section || t.noSection}
                                            </div>
                                        </div>

                                        <div className="flex shrink-0 items-center gap-1.5">
                                            <button
                                                type="button"
                                                aria-label={t.editAria}
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    selectForEdit(student)
                                                }}
                                                className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 transition-colors duration-200 hover:bg-gray-900/5 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-100/10 dark:hover:text-gray-50"
                                            >
                                                <Pencil size={16} />
                                            </button>
                                            <button
                                                type="button"
                                                aria-label={t.deleteAria}
                                                disabled={isDeleting}
                                                onClick={(e) => handleDelete(student, e)}
                                                className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 transition-colors duration-200 hover:bg-red-500/10 hover:text-red-600 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-red-500/15 dark:hover:text-red-400"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    <Pagination page={page} pageCount={pageCount} onPageChange={setPage} className="mt-5" />
                </div>

                {/* Right — the persistent add/edit panel */}
                <aside className="sticky top-24 self-start rounded-3xl border border-gray-900/5 bg-white shadow-sm dark:border-gray-100/10 dark:bg-gray-900">
                    <div className="flex items-center gap-3 border-b border-gray-900/5 px-5 py-4 dark:border-gray-100/10">
                        <span
                            className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                                editing ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400' : 'bg-teal-500/15 text-teal-600 dark:text-teal-400'
                            }`}
                        >
                            <UserPlus size={18} />
                        </span>
                        <div>
                            <h2 className="text-base font-extrabold text-gray-900 dark:text-gray-50">
                                {editing ? t.formEditTitle : t.formCreateTitle}
                            </h2>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-300">
                                {editing ? t.formEditSubtitle : t.formCreateSubtitle}
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="px-5 py-5">
                        {!editing && (
                            <Text
                                name="username"
                                label={t.fieldUsername}
                                value={form.username}
                                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                                required
                                className="mb-4"
                                inputClassName="px-4 py-3 rounded-xl transition-colors duration-300"
                            />
                        )}
                        <Text
                            name="fullName"
                            label={t.fieldFullName}
                            value={form.fullName}
                            onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                            required
                            className="mb-4"
                            inputClassName="px-4 py-3 rounded-xl transition-colors duration-300"
                        />
                        {!editing && (
                            <Password
                                name="password"
                                label={t.fieldPassword}
                                value={form.password}
                                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                                required
                                className="mb-4"
                                inputClassName="px-4 py-3 pr-11 rounded-xl transition-colors duration-300"
                            />
                        )}
                        <div className="mb-4 grid grid-cols-2 gap-3">
                            <Text
                                name="gradeLevel"
                                type="number"
                                label={t.fieldGrade}
                                value={form.gradeLevel}
                                onChange={(e) => setForm((f) => ({ ...f, gradeLevel: e.target.value }))}
                                inputClassName="px-4 py-3 rounded-xl transition-colors duration-300"
                            />
                            <Text
                                name="section"
                                label={t.fieldSection}
                                value={form.section}
                                onChange={(e) => setForm((f) => ({ ...f, section: e.target.value }))}
                                inputClassName="px-4 py-3 rounded-xl transition-colors duration-300"
                            />
                        </div>
                        <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                            <input
                                type="checkbox"
                                checked={form.isNonReader}
                                onChange={(e) => setForm((f) => ({ ...f, isNonReader: e.target.checked }))}
                                className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400"
                            />
                            {t.fieldNonReader}
                        </label>

                        {editing && (
                            <p className="mb-2 text-xs font-medium text-gray-400 dark:text-gray-400">{t.editNote}</p>
                        )}

                        {formError && (
                            <p className="mb-2 text-sm font-semibold text-red-600 dark:text-red-400">{formError}</p>
                        )}

                        <div className="mt-4 flex items-center justify-between gap-2">
                            {editing ? (
                                <button
                                    type="button"
                                    onClick={resetToCreate}
                                    className="text-sm font-bold text-gray-500 transition-colors duration-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                                >
                                    {t.cancel}
                                </button>
                            ) : (
                                <span />
                            )}
                            <button
                                type="submit"
                                disabled={submitting}
                                className="rounded-full bg-orange-500 px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_0_0_#c2410c] transition-[background-color,box-shadow,transform] duration-300 active:translate-y-1 active:shadow-[0_1px_0_0_#c2410c] disabled:opacity-60 dark:bg-orange-600 dark:shadow-[0_4px_0_0_#9a3412]"
                            >
                                {editing ? (submitting ? t.saving : t.save) : (submitting ? t.creating : t.create)}
                            </button>
                        </div>
                    </form>
                </aside>
            </div>
        </div>
    )
}

export default StudentList