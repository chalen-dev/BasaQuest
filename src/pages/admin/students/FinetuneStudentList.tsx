// File: src/pages/admin/students/FinetuneStudentList.tsx
// Full CRUD roster for the fine-tuning recording pilot — styled to match
// the real StudentList.tsx (gradient hero, StudentRow-style cards, Drawer
// for add/edit), now on TanStack Query like the rest of the app's CRUD
// features instead of hand-rolled useState/useEffect.
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Pencil, Trash2, UserRound, FileAudio } from 'lucide-react'
import { useTheme } from '../../../contexts/ThemeContext'
import { showConfirmation, showToast } from '../../../helpers/swalHelpers'
import { SearchInput } from '../../../components/input/SearchInput'
import { Drawer } from '../../../components/ui/Drawer'
import { Tooltip } from '../../../components/ui/Tooltip'
import { Pagination } from '../../../components/ui/Pagination'
import { AdminSubNav } from '../components/AdminSubNav'
import { GenderBadge } from '../genderDisplay'
import {
    useFinetuneStudentsQuery,
    useCreateFinetuneStudentMutation,
    useUpdateFinetuneStudentMutation,
    useDeleteFinetuneStudentMutation,
    type FinetuneStudent,
    type NewFinetuneStudent,
} from '../useFinetuneStudents.ts'
import { useStudentRecordingCountsQuery } from '../useStudentRecordings.ts'
import { useConsentFileCountsQuery } from '../useConsentFiles.ts'
import StudentFormFields from './StudentFormFields'
import ConsentFiles from './ConsentFiles'

const PAGE_SIZE = 8

const EMPTY: NewFinetuneStudent = {
    full_name: '',
    grade_level: null,
    gender: null,
    reading_tier: null,
    consent_on_file: false,
    notes: null,
}

function toFormValue(s: FinetuneStudent): NewFinetuneStudent {
    return {
        full_name: s.full_name,
        grade_level: s.grade_level,
        gender: s.gender,
        reading_tier: s.reading_tier,
        consent_on_file: s.consent_on_file,
        notes: s.notes,
    }
}

export default function FinetuneStudentList() {
    const { theme } = useTheme()
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()
    const { data, isLoading, error } = useFinetuneStudentsQuery()
    const students = data ?? []
    const createMutation = useCreateFinetuneStudentMutation()
    const updateMutation = useUpdateFinetuneStudentMutation()
    const deleteMutation = useDeleteFinetuneStudentMutation()
    const { data: recordingCountsData } = useStudentRecordingCountsQuery()
    const recordingCounts = recordingCountsData ?? {}
    // consent_on_file (the DB column) stopped being settable once the
    // manual checkbox was removed from the form — treat "has ≥1 consent
    // file attached" as the real signal instead, everywhere this page
    // shows a consent badge.
    const { data: consentCountsData } = useConsentFileCountsQuery()
    const consentCounts = consentCountsData ?? {}

    const [search, setSearch] = useState('')
    const [page, setPage] = useState(0)
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [editing, setEditing] = useState<FinetuneStudent | null>(null)
    const [formValue, setFormValue] = useState<NewFinetuneStudent>(EMPTY)
    const [formError, setFormError] = useState('')

    const filtered = students.filter((s) => s.full_name.toLowerCase().includes(search.toLowerCase()))
    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    const paginated = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

    const submitting = createMutation.isPending || updateMutation.isPending

    const handleSearchChange = (value: string) => {
        setSearch(value)
        setPage(0)
    }

    const openCreate = () => {
        setEditing(null)
        setFormValue(EMPTY)
        setFormError('')
        setDrawerOpen(true)
    }

    const openEdit = (s: FinetuneStudent) => {
        setEditing(s)
        setFormValue(toFormValue(s))
        setFormError('')
        setDrawerOpen(true)
    }

    const closeDrawer = () => setDrawerOpen(false)

    // Deep-link support: SelectStudent.tsx's row-level Edit button
    // navigates here with ?edit=<id> so an admin can jump straight from
    // the recording picker into that student's edit drawer instead of
    // having to search for them again on this page. Consumes the param
    // once (strips it from the URL) so refreshing/closing doesn't keep
    // reopening the drawer.
    useEffect(() => {
        const editId = searchParams.get('edit')
        if (!editId || students.length === 0) return
        const target = students.find((s) => s.id === editId)
        if (!target) return
        // eslint-disable-next-line react-hooks/set-state-in-effect
        openEdit(target)
        setSearchParams(
            (prev) => {
                const next = new URLSearchParams(prev)
                next.delete('edit')
                return next
            },
            { replace: true },
        )
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams, students])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formValue.full_name.trim()) {
            setFormError('Name is required.')
            return
        }
        setFormError('')
        try {
            if (editing) {
                const updated = await updateMutation.mutateAsync({ id: editing.id, ...formValue })
                // Keep `editing` in sync so ConsentFiles (which reads
                // editing.id) doesn't have to wait for the drawer to
                // reopen, and so re-submitting reflects the saved values.
                setEditing(updated)
                showToast('Saved.', 'success', theme === 'dark', { timer: 1200 })
            } else {
                const created = await createMutation.mutateAsync(formValue)
                // Drop straight into edit mode instead of closing the
                // drawer — the whole point is to make attaching consent
                // files immediately after creation fast, without having
                // to reopen the drawer and find the student again.
                setEditing(created)
                setFormValue(toFormValue(created))
                showToast(`Added ${formValue.full_name}.`, 'success', theme === 'dark', { timer: 1500 })
            }
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
        }
    }

    const handleDelete = async (s: FinetuneStudent, e: React.MouseEvent) => {
        e.stopPropagation()
        const confirmed = await showConfirmation(
            'Remove this student?',
            `This deletes "${s.full_name}" from the fine-tuning roster. Any saved recordings and consent files linked to them will be deleted too (cascade).`,
            theme === 'dark',
            'warning',
            'Yes, remove',
        )
        if (!confirmed) return
        try {
            await deleteMutation.mutateAsync(s.id)
            showToast('Removed.', 'success', theme === 'dark', { timer: 1200 })
            if (editing?.id === s.id) {
                setDrawerOpen(false)
                setEditing(null)
            }
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Failed to remove student.', 'error', theme === 'dark')
        }
    }

    const showEmpty = !isLoading && !error && students.length === 0
    const showNoResults = !isLoading && !error && students.length > 0 && filtered.length === 0

    return (
        <div className="mx-auto max-w-6xl px-4 pb-12 pt-2">
            <AdminSubNav />
            {/* Hero card — same layered-gradient treatment as StudentList's
            (amber/cream light, navy/teal dark), so this reads as part of
            the same app instead of a visually different one-off page. */}
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
                            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-50">
                                Fine-tuning student roster
                            </h1>
                            <p className="mt-1 text-sm font-medium text-gray-600 dark:text-gray-300">
                                Separate from BasaQuest's regular students — used only for the child-recording
                                fine-tuning pilot.
                            </p>
                        </div>
                        <button
                            onClick={openCreate}
                            className="flex w-fit cursor-pointer items-center gap-1.5 rounded-full bg-teal-500 px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_0_0_#0f766e] transition-[transform,box-shadow] duration-150 active:translate-y-1 active:shadow-[0_1px_0_0_#0f766e] dark:bg-teal-600 dark:shadow-[0_4px_0_0_#115e59]"
                        >
                            <Plus size={16} />
                            Add student
                        </button>
                    </div>
                    <div className="mt-5">
                        <SearchInput value={search} onChange={handleSearchChange} label="Search" placeholder="Name…" />
                    </div>
                    {!isLoading && !error && students.length > 0 && (
                        <div className="mt-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400">
                            {students.length} student{students.length === 1 ? '' : 's'}
                        </div>
                    )}
                </div>
            </section>
            {isLoading ? (
                <div className="rounded-2xl border-2 border-gray-900/5 bg-white p-10 text-center text-sm font-bold text-gray-500 dark:border-gray-100/10 dark:bg-gray-900 dark:text-gray-400">
                    Loading…
                </div>
            ) : error ? (
                <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                    Couldn't load: {error instanceof Error ? error.message : 'Something went wrong.'}
                </div>
            ) : showEmpty ? (
                <div className="rounded-2xl border-2 border-dashed border-gray-900/10 bg-white p-10 text-center dark:border-gray-100/10 dark:bg-gray-900">
                    <p className="text-base font-extrabold text-gray-900 dark:text-gray-50">No students yet.</p>
                    <p className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-300">
                        Use "Add student" above to create the first entry.
                    </p>
                </div>
            ) : showNoResults ? (
                <div className="rounded-2xl border-2 border-dashed border-gray-900/10 bg-white p-10 text-center dark:border-gray-100/10 dark:bg-gray-900">
                    <p className="text-base font-extrabold text-gray-900 dark:text-gray-50">No matches found.</p>
                    <p className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-300">Try a different name.</p>
                </div>
            ) : (
                <>
                    <div className="flex flex-col gap-3">
                        {paginated.map((s) => {
                            const hasConsent = (consentCounts[s.id] ?? 0) > 0
                            const accent = hasConsent ? '#14b8a6' : '#ef4444'
                            const isDeleting = deleteMutation.isPending && deleteMutation.variables === s.id
                            const recordingCount = recordingCounts[s.id] ?? 0
                            const hasRecordings = recordingCount > 0
                            return (
                                <div
                                    key={s.id}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => openEdit(s)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') openEdit(s)
                                    }}
                                    style={{ borderLeftColor: accent, borderLeftWidth: 6 }}
                                    className={`group flex w-full cursor-pointer items-center gap-4 rounded-2xl border-2 bg-white p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:bg-gray-900 ${
                                        drawerOpen && editing?.id === s.id
                                            ? 'border-gray-900/20 ring-2 ring-teal-400/60 dark:border-gray-100/25'
                                            : 'border-gray-900/5 dark:border-gray-100/10'
                                    } ${isDeleting ? 'opacity-50' : ''}`}
                                >
                                    <span
                                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-base font-extrabold"
                                        style={{ background: `${accent}22`, color: accent }}
                                    >
                                        {s.full_name?.[0]?.toUpperCase() ?? <UserRound size={18} />}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-base font-extrabold text-gray-900 dark:text-gray-50">
                                                {s.full_name}
                                            </span>
                                            <span
                                                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                                    hasConsent
                                                        ? 'bg-green-500/15 text-green-600 dark:text-green-400'
                                                        : 'bg-red-500/15 text-red-600 dark:text-red-400'
                                                }`}
                                            >
                                                {hasConsent ? 'consent on file' : 'no consent'}
                                            </span>
                                            {s.grade_level != null && (
                                                <span className="rounded-full bg-gray-900/5 px-2.5 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-100/10 dark:text-gray-300">
                                                    Grade {s.grade_level}
                                                </span>
                                            )}
                                            <GenderBadge gender={s.gender} />
                                            {s.reading_tier && (
                                                <span className="rounded-full bg-teal-500/15 px-2.5 py-0.5 text-xs font-semibold text-teal-600 dark:text-teal-400">
                                                    {s.reading_tier} grade level
                                                </span>
                                            )}
                                        </div>
                                        {s.notes && (
                                            <div className="mt-0.5 text-sm font-medium text-gray-500 dark:text-gray-300">
                                                {s.notes}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex shrink-0 items-center gap-1.5">
                                        {/* Jumps straight to this student's recordings review
                                        page — disabled (and shows the count) when there's
                                        nothing to review yet. */}
                                        <button
                                            type="button"
                                            aria-label="View recordings"
                                            disabled={!hasRecordings}
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                if (!hasRecordings) return
                                                navigate(`/admin/recording/history?student=${s.id}`)
                                            }}
                                            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-bold transition-colors duration-200 ${
                                                hasRecordings
                                                    ? 'cursor-pointer bg-orange-500/15 text-orange-600 hover:bg-orange-500/25 dark:bg-orange-500/20 dark:text-orange-300 dark:hover:bg-orange-500/30'
                                                    : 'cursor-not-allowed bg-gray-900/5 text-gray-400 dark:bg-gray-100/5 dark:text-gray-600'
                                            }`}
                                        >
                                            <FileAudio size={14} />
                                            {hasRecordings ? `Recordings (${recordingCount})` : 'No recordings'}
                                        </button>
                                        <Tooltip label="Edit">
                                            <button
                                                type="button"
                                                aria-label="Edit"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    openEdit(s)
                                                }}
                                                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-gray-500 transition-colors duration-200 hover:bg-gray-900/5 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-100/10 dark:hover:text-gray-50"
                                            >
                                                <Pencil size={16} />
                                            </button>
                                        </Tooltip>
                                        <Tooltip label="Remove">
                                            <button
                                                type="button"
                                                aria-label="Remove"
                                                disabled={isDeleting}
                                                onClick={(e) => handleDelete(s, e)}
                                                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-gray-500 transition-colors duration-200 hover:bg-red-500/10 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-400 dark:hover:bg-red-500/15 dark:hover:text-red-400"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </Tooltip>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    <Pagination page={page} pageCount={pageCount} onPageChange={setPage} className="mt-5" />
                </>
            )}
            <Drawer
                open={drawerOpen}
                onClose={closeDrawer}
                title={editing ? 'Edit Student' : 'New Student'}
                subtitle={editing ? "You're editing this student's details." : 'Fill in the details to add them to the fine-tuning roster.'}
                icon={
                    <span
                        className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                            editing ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400' : 'bg-teal-500/15 text-teal-600 dark:text-teal-400'
                        }`}
                    >
                        <UserRound size={18} />
                    </span>
                }
            >
                <form onSubmit={handleSubmit}>
                    <StudentFormFields value={formValue} onChange={setFormValue} />
                    {editing ? (
                        <div className="mt-5 border-t border-gray-900/10 pt-5 dark:border-gray-100/10">
                            <ConsentFiles studentId={editing.id} />
                            <div className="mt-5 border-t border-gray-900/10 pt-5 dark:border-gray-100/10">
                                <Link
                                    to={`/admin/recording/history?student=${editing.id}`}
                                    className="flex w-fit items-center gap-1.5 rounded-full border border-gray-900/10 px-3.5 py-2 text-xs font-bold text-gray-600 transition-colors duration-150 hover:bg-gray-900/5 dark:border-gray-100/10 dark:text-gray-300 dark:hover:bg-gray-100/10"
                                >
                                    <FileAudio size={14} />
                                    View recordings
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <p className="mt-5 rounded-xl border border-dashed border-gray-900/15 px-3 py-2.5 text-xs font-medium text-gray-500 dark:border-gray-100/15 dark:text-gray-400">
                            Save this student first, then reopen them to attach consent files.
                        </p>
                    )}
                    {formError && (
                        <p className="mb-2 mt-4 text-sm font-semibold text-red-600 dark:text-red-400">{formError}</p>
                    )}
                    <div className="mt-5 flex items-center justify-between gap-2">
                        <button
                            type="button"
                            onClick={closeDrawer}
                            className="cursor-pointer rounded-full border-2 border-red-300 bg-white px-5 py-2.5 text-sm font-bold text-red-600 shadow-sm transition-colors duration-300 hover:bg-red-50 dark:border-red-500/40 dark:bg-gray-900 dark:text-red-400 dark:hover:bg-red-500/10"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="cursor-pointer rounded-full bg-teal-500 px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_0_0_#0f766e] transition-[background-color,box-shadow,transform] duration-300 active:translate-y-1 active:shadow-[0_1px_0_0_#0f766e] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-teal-600 dark:shadow-[0_4px_0_0_#115e59]"
                        >
                            {editing ? (submitting ? 'Saving...' : 'Save') : (submitting ? 'Adding...' : 'Add')}
                        </button>
                    </div>
                </form>
            </Drawer>
        </div>
    )
}