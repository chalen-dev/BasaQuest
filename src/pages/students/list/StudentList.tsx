// File: src/pages/students/list/StudentList.tsx
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Plus, X, UserRound } from 'lucide-react'
import { useLang } from '../../../contexts/LangContext'
import { useTheme } from '../../../contexts/ThemeContext'
import { useProfile } from '../../../hooks/useProfile'
import { supabase } from '../../../lib/supabaseClient'
import { Text } from '../../../components/input/Text'
import { Password } from '../../../components/input/Password'
import { showToast } from '../../../helpers/swalHelpers'
import type { Lang } from '../../../components/buttons/LangToggle'
import { StudentsSubNav } from '../components/StudentsSubNav'

type StudentRow = {
    id: string
    username: string | null
    full_name: string | null
    grade_level: number | null
    section: string | null
    is_non_reader: boolean
}

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

const STRINGS: Record<Lang, {
    back: string
    title: string
    subtitle: string
    addButton: string
    loading: string
    emptyTitle: string
    emptyDesc: string
    gradeLabel: (n: number) => string
    nonReader: string
    noSection: string
    modalCreateTitle: string
    modalEditTitle: string
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
}> = {
    fil: {
        back: '← Tahanan',
        title: 'Listahan ng mga Estudyante',
        subtitle: 'Ang mga mag-aaral na nakatalaga sa iyo. Idagdag, i-edit, o suriin ang kanilang detalye.',
        addButton: 'Magdagdag ng estudyante',
        loading: 'Kinukuha ang listahan...',
        emptyTitle: 'Wala ka pang estudyante.',
        emptyDesc: 'Pindutin ang "Magdagdag ng estudyante" para gumawa ng unang account.',
        gradeLabel: (n) => `Baitang ${n}`,
        nonReader: 'Non-reader',
        noSection: 'Walang section',
        modalCreateTitle: 'Bagong Estudyante',
        modalEditTitle: 'I-edit ang Estudyante',
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
    },
    en: {
        back: '← Home',
        title: 'Student List',
        subtitle: 'Pupils assigned to you. Add, edit, or review their details.',
        addButton: 'Add student',
        loading: 'Loading students...',
        emptyTitle: "You don't have any students yet.",
        emptyDesc: 'Tap "Add student" to create the first account.',
        gradeLabel: (n) => `Grade ${n}`,
        nonReader: 'Non-reader',
        noSection: 'No section',
        modalCreateTitle: 'New Student',
        modalEditTitle: 'Edit Student',
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
    },
}

export const StudentList: React.FC = () => {
    const navigate = useNavigate()
    const { lang } = useLang()
    const { theme } = useTheme()
    const { profile } = useProfile()
    const t = STRINGS[lang]

    const [students, setStudents] = useState<StudentRow[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    const [modalOpen, setModalOpen] = useState(false)
    const [editing, setEditing] = useState<StudentRow | null>(null)
    const [form, setForm] = useState<FormState>(EMPTY_FORM)
    const [submitting, setSubmitting] = useState(false)
    const [formError, setFormError] = useState('')

    const loadStudents = async (teacherId: string) => {
        setLoading(true)
        const { data, error } = await supabase
            .from('profiles')
            .select('id, username, full_name, grade_level, section, is_non_reader')
            .eq('teacher_id', teacherId)
            .eq('role', 'student')
            .order('full_name', { ascending: true })
        if (error) {
            setError(error.message)
        } else {
            setStudents((data ?? []) as StudentRow[])
        }
        setLoading(false)
    }

    useEffect(() => {
        if (!profile?.id) return
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadStudents(profile.id)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile?.id])

    const openCreate = () => {
        setEditing(null)
        setForm(EMPTY_FORM)
        setFormError('')
        setModalOpen(true)
    }

    const openEdit = (student: StudentRow) => {
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
        setModalOpen(true)
    }

    const closeModal = () => {
        if (submitting) return
        setModalOpen(false)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!profile?.id) return
        setFormError('')
        setSubmitting(true)
        try {
            if (editing) {
                const { error } = await supabase
                    .from('profiles')
                    .update({
                        full_name: form.fullName || null,
                        grade_level: form.gradeLevel ? Number(form.gradeLevel) : null,
                        section: form.section || null,
                        is_non_reader: form.isNonReader,
                    })
                    .eq('id', editing.id)
                if (error) throw error
                showToast(t.updatedToast, 'success', theme === 'dark')
            } else {
                const { data, error } = await supabase.functions.invoke('create-student', {
                    body: {
                        username: form.username,
                        fullName: form.fullName,
                        password: form.password,
                        gradeLevel: form.gradeLevel ? Number(form.gradeLevel) : null,
                        section: form.section || null,
                        isNonReader: form.isNonReader,
                    },
                })
                if (error) throw error
                if (data?.error) throw new Error(data.error)
                showToast(t.createdToast, 'success', theme === 'dark')
            }
            setModalOpen(false)
            await loadStudents(profile.id)
        } catch (err) {
            setFormError(err instanceof Error ? err.message : t.errorGeneric)
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="mx-auto max-w-4xl px-4 pb-12 pt-2">
            <button
                onClick={() => navigate('/home')}
                className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-dashed border-gray-900/20 px-4 py-1.5 text-sm font-bold text-gray-600 transition-colors duration-300 hover:bg-gray-900/5 dark:border-gray-100/20 dark:text-gray-300 dark:hover:bg-gray-100/10"
            >
                {t.back}
            </button>

            <StudentsSubNav />

            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-50">{t.title}</h1>
                    <p className="mt-1 text-sm font-medium text-gray-600 dark:text-gray-400">{t.subtitle}</p>
                </div>
                <button
                    onClick={openCreate}
                    className="flex w-fit items-center gap-1.5 rounded-full bg-teal-500 px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_0_0_#0f766e] transition-[transform,box-shadow] duration-150 active:translate-y-1 active:shadow-[0_1px_0_0_#0f766e] dark:bg-teal-600 dark:shadow-[0_4px_0_0_#115e59]"
                >
                    <Plus size={16} />
                    {t.addButton}
                </button>
            </div>

            {loading ? (
                <div className="rounded-2xl border-2 border-gray-900/5 bg-white p-10 text-center text-sm font-bold text-gray-500 dark:border-gray-100/10 dark:bg-gray-900 dark:text-gray-400">
                    {t.loading}
                </div>
            ) : error ? (
                <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                    {error}
                </div>
            ) : students.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-gray-900/10 bg-white p-10 text-center dark:border-gray-100/10 dark:bg-gray-900">
                    <p className="text-base font-extrabold text-gray-900 dark:text-gray-50">{t.emptyTitle}</p>
                    <p className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-400">{t.emptyDesc}</p>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {students.map((student) => {
                        const accent = student.is_non_reader ? '#f97316' : '#14b8a6'
                        return (
                            <button
                                key={student.id}
                                onClick={() => openEdit(student)}
                                style={{ borderLeftColor: accent, borderLeftWidth: 6 }}
                                className="group flex w-full items-center gap-4 rounded-2xl border-2 border-gray-900/5 bg-white p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-gray-100/10 dark:bg-gray-900"
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
                                    <div className="mt-0.5 text-sm font-medium text-gray-500 dark:text-gray-400">
                                        @{student.username} · {student.section || t.noSection}
                                    </div>
                                </div>

                                <ChevronRight size={20} className="shrink-0 text-gray-400 transition-transform duration-150 group-hover:translate-x-1 dark:text-gray-500" />
                            </button>
                        )
                    })}
                </div>
            )}

            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 px-4 backdrop-blur-sm" onClick={closeModal}>
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-md overflow-hidden rounded-3xl border border-gray-900/5 bg-white shadow-xl dark:border-gray-100/10 dark:bg-gray-900"
                    >
                        <div className="flex items-center justify-between border-b border-gray-900/5 px-6 py-4 dark:border-gray-100/10">
                            <h2 className="text-lg font-extrabold text-gray-900 dark:text-gray-50">
                                {editing ? t.modalEditTitle : t.modalCreateTitle}
                            </h2>
                            <button
                                onClick={closeModal}
                                className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors duration-300 hover:bg-gray-900/5 dark:hover:bg-gray-100/10"
                                aria-label="Close"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="px-6 py-5">
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
                                <p className="mb-2 text-xs font-medium text-gray-400 dark:text-gray-500">{t.editNote}</p>
                            )}

                            {formError && (
                                <p className="mb-2 text-sm font-semibold text-red-600 dark:text-red-400">{formError}</p>
                            )}

                            <div className="mt-4 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="rounded-full px-4 py-2.5 text-sm font-bold text-gray-600 transition-colors duration-300 hover:bg-gray-900/5 dark:text-gray-300 dark:hover:bg-gray-100/10"
                                >
                                    {t.cancel}
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="rounded-full bg-orange-500 px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_0_0_#c2410c] transition-[background-color,box-shadow,transform] duration-300 active:translate-y-1 active:shadow-[0_1px_0_0_#c2410c] disabled:opacity-60 dark:bg-orange-600 dark:shadow-[0_4px_0_0_#9a3412]"
                                >
                                    {editing ? (submitting ? t.saving : t.save) : (submitting ? t.creating : t.create)}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

export default StudentList