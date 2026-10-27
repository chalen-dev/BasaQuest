// File: src/pages/proficiency/pre_assessment/PreAssessment.tsx
// Entry point for the oral reading fluency (ORF) check-in.
//
// Student flow: a bigger, hero-style language picker (big bobbing owl +
// gradient card, same visual language as MaterialSelection's hero, then
// two large clickable language cards below it, styled like the
// FOUNDATIONALS cards on that page) — picking either navigates straight
// into the session.
//
// Teacher flow: the compact language row, then "Select a Student" below
// it. A row only SELECTS the pupil: its one button opens the passage check
// screen (AssessmentSessionPage's 'review' step), labelled by what the
// pupil's saved passage needs next (generate / validate / open), with a
// badge for the same status and a bin to clear a generated passage. The
// choice of how to run the check-in now lives on that screen, after the
// teacher has validated the passage:
//   - "Start now" — runs the session in THIS tab, on the teacher's own
//     account, for one-on-one same-device use.
//   - "Send" — writes a pending assigned_assessments row that opens on the
//     STUDENT's own account next time they log in, with the validated
//     passage waiting for them (see savedPassages.ts).
// A pending "Send" still shows its Pending badge and Cancel button here.
// The old "Log in as this student" feature (StudentList.tsx) was retired:
// it opened a second isolated-session tab that could get clobbered on
// reload since both tabs shared the same browser.
//
// LOADING STATE (student list): skeleton rows (see
// components/ui/Skeleton.tsx) matching studentRow's own shape (name +
// badge row on the left, two action-button-shaped blocks on the right)
// instead of a centered OwlLoader spinner.
import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, FileCheck, FileClock, Languages, Send, Trash2, Wifi, X } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { deleteSavedPassage, useSavedPassageStatusesQuery } from '../savedPassages.ts'
import { Owl } from '../../../../components/ui/Owl.tsx'
import { Skeleton } from '../../../../components/ui/Skeleton.tsx'
import { Pagination } from '../../../../components/ui/Pagination.tsx'
import { SearchInput } from '../../../../components/input/SearchInput.tsx'
import { Select } from '../../../../components/input/Select.tsx'
import { useLang } from '../../../../contexts/LangContext.tsx'
import { useProfile } from '../../../../hooks/useProfile.ts'
import { useTheme } from '../../../../contexts/ThemeContext.tsx'
import { useTeacherPresence } from '../../../../hooks/useTeacherPresence.ts'
import { showConfirmation, showToast } from '../../../../helpers/swalHelpers.ts'
import {
    ASSIGNABLE_PAGE_SIZE,
    useAssignableStudentsQuery,
    useCancelAssignedAssessmentMutation,
    type AssignableOnlineFilter,
    type AssignableReaderFilter,
} from '../hooks.ts'
import type { Lang } from '../../../../components/buttons/LangToggle.tsx'
const GRADE_OPTIONS = [1, 2, 3, 4, 5, 6]
const STRINGS: Record<Lang, {
    back: string
    languageKicker: string
    languageTitle: string
    languageDesc: string
    filipinoLabel: string
    filipinoDesc: string
    englishLabel: string
    englishDesc: string
    selectedBadge: string
    startLabel: string
    studentPickerKicker: string
    studentPickerTitle: string
    studentPickerDesc: string
    pickLanguageFirst: string
    searchLabel: string
    searchPlaceholder: string
    gradeFilterLabel: string
    gradeFilterAll: string
    readerFilterLabel: string
    readerFilterAll: string
    readerFilterReaders: string
    readerFilterNonReaders: string
    onlineFilterLabel: string
    onlineFilterAll: string
    onlineFilterOnline: string
    onlineFilterOffline: string
    onlineNote: string
    nonReaderBadge: string
    pendingBadge: string
    // A passage already generated for this pupil in the chosen language.
    passageUnvalidatedBadge: string
    passageUnvalidatedTip: string
    passageReadyBadge: string
    passageReadyTip: string
    cancelLabel: string
    // The row's one action opens the passage check screen, labelled by what
    // that pupil's saved passage needs next.
    openNewLabel: string
    openValidateLabel: string
    openReadyLabel: string
    clearLabel: string
    clearConfirmTitle: (name: string) => string
    clearConfirmText: string
    clearOnlineWarning: (name: string) => string
    clearConfirmButton: string
    clearSuccessToast: string
    noStudents: string
    noResults: string
    gradeLabel: (n: number) => string
    cancelConfirmTitle: string
    cancelConfirmText: string
    cancelConfirmButton: string
    cancelSuccessToast: string
}> = {
    fil: {
        back: 'Bumalik',
        languageKicker: 'Unang Hakbang',
        languageTitle: 'Aling Wika ang Gagamitin?',
        languageDesc: 'Ito ang wika ng talatang bubuuin. Piliin ang isa sa ibaba para magsimula.',
        filipinoLabel: 'Filipino',
        filipinoDesc: 'Bubuo ng talata sa Filipino/Tagalog.',
        englishLabel: 'English',
        englishDesc: 'Will generate the passage in English.',
        selectedBadge: 'Napili',
        startLabel: 'Simulan',
        studentPickerKicker: 'Pangalawang Hakbang',
        studentPickerTitle: 'Pumili ng Estudyante',
        studentPickerDesc: 'Pumili ng estudyante. Gagawa o bubuksan mo ang talata niya, susuriin ito, at saka mo pipiliin kung gagawin ito ngayon sa device na ito o ipapadala sa device ng estudyante.',
        pickLanguageFirst: 'Pumili muna ng wika sa itaas.',
        searchLabel: 'Maghanap',
        searchPlaceholder: 'Pangalan o username...',
        gradeFilterLabel: 'Baitang',
        gradeFilterAll: 'Lahat ng baitang',
        readerFilterLabel: 'Uri ng mambabasa',
        readerFilterAll: 'Lahat',
        readerFilterReaders: 'Mambabasa',
        readerFilterNonReaders: 'Non-reader',
        onlineFilterLabel: 'Presensya',
        onlineFilterAll: 'Lahat',
        onlineFilterOnline: 'Online',
        onlineFilterOffline: 'Offline',
        onlineNote: 'Naka-online — paalisin muna sa sistema.',
        nonReaderBadge: 'Non-reader',
        pendingBadge: 'Naghihintay',
        passageUnvalidatedBadge: 'Kailangang suriin',
        passageUnvalidatedTip: 'May nagawa nang talata para sa batang ito na hindi pa nasusuri.',
        passageReadyBadge: 'Handa na ang talata',
        passageReadyTip: 'Nasuri na ang talata para sa batang ito.',
        cancelLabel: 'Kanselahin',
        openNewLabel: 'Gumawa ng talata',
        openValidateLabel: 'Suriin ang talata',
        openReadyLabel: 'Buksan',
        clearLabel: 'Burahin ang nagawang talata',
        clearConfirmTitle: (name) => `Burahin ang talata ni ${name}?`,
        clearConfirmText: 'Mabubura ang nagawang talata, at makakagawa ka ng bago.',
        clearOnlineWarning: (name) => `Naka-online ngayon si ${name} at maaaring binabasa na ito. Mananatili sa kanya ang talatang nakabukas na, pero wala na siyang makikita kapag nag-reload siya.`,
        clearConfirmButton: 'Oo, burahin',
        clearSuccessToast: 'Nabura na ang talata.',
        noStudents: 'Wala pang estudyanteng naka-enrol.',
        noResults: 'Walang nahanap.',
        gradeLabel: (n) => `Baitang ${n}`,
        cancelConfirmTitle: 'Kanselahin ang naka-pending na pagsusuri?',
        cancelConfirmText: 'Hindi na ito awtomatikong bubukas sa estudyante.',
        cancelConfirmButton: 'Oo, kanselahin',
        cancelSuccessToast: 'Nakansela na.',
    },
    en: {
        back: 'Back',
        languageKicker: 'First Step',
        languageTitle: 'Which Language?',
        languageDesc: 'This is the language your passage will be written in. Pick one below to get started.',
        filipinoLabel: 'Filipino',
        filipinoDesc: 'Bubuo ng talata sa Filipino/Tagalog.',
        englishLabel: 'English',
        englishDesc: 'Will generate the passage in English.',
        selectedBadge: 'Selected',
        startLabel: 'Start',
        studentPickerKicker: 'Second Step',
        studentPickerTitle: 'Select a Student',
        studentPickerDesc: "Pick a student. You will generate or open their passage, validate it, and then choose whether to run the check-in now on this device or send it to the student's own device.",
        pickLanguageFirst: 'Pick a language above first.',
        searchLabel: 'Search',
        searchPlaceholder: 'Name or username...',
        gradeFilterLabel: 'Grade',
        gradeFilterAll: 'All grades',
        readerFilterLabel: 'Reader type',
        readerFilterAll: 'All',
        readerFilterReaders: 'Readers',
        readerFilterNonReaders: 'Non-readers',
        onlineFilterLabel: 'Presence',
        onlineFilterAll: 'All',
        onlineFilterOnline: 'Online',
        onlineFilterOffline: 'Offline',
        onlineNote: 'Online — ask them to log out first.',
        nonReaderBadge: 'Non-reader',
        pendingBadge: 'Pending',
        passageUnvalidatedBadge: 'Needs validation',
        passageUnvalidatedTip: 'A passage was already generated for this pupil but not validated yet.',
        passageReadyBadge: 'Passage ready',
        passageReadyTip: 'The passage for this pupil is validated.',
        cancelLabel: 'Cancel',
        openNewLabel: 'Generate passage',
        openValidateLabel: 'Validate passage',
        openReadyLabel: 'Open',
        clearLabel: 'Clear the generated passage',
        clearConfirmTitle: (name) => `Clear ${name}'s passage?`,
        clearConfirmText: 'The generated passage will be deleted so you can make a new one.',
        clearOnlineWarning: (name) => `${name} is online right now and may be reading it. They keep the passage they already have open, but would find nothing if they reload.`,
        clearConfirmButton: 'Yes, clear it',
        clearSuccessToast: 'Passage cleared.',
        noStudents: 'No students enrolled yet.',
        noResults: 'No matches found.',
        gradeLabel: (n) => `Grade ${n}`,
        cancelConfirmTitle: 'Cancel the pending check-in?',
        cancelConfirmText: "It won't open automatically for the student anymore.",
        cancelConfirmButton: 'Yes, cancel',
        cancelSuccessToast: 'Cancelled.',
    },
}
export const ProficiencyAssessmentSelectStudentPage: React.FC = () => {
    const navigate = useNavigate()
    const { lang } = useLang()
    const { profile } = useProfile()
    const { theme } = useTheme()
    const t = STRINGS[lang]
    const isTeacher = profile?.role === 'teacher'
    const [selectedLang, setSelectedLang] = useState<Lang | null>(null)
    const [searchInput, setSearchInput] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [gradeFilter, setGradeFilter] = useState('')
    const [readerFilter, setReaderFilter] = useState<AssignableReaderFilter>('')
    const [onlineFilter, setOnlineFilter] = useState<AssignableOnlineFilter>('offline')
    const [page, setPage] = useState(0)
    useEffect(() => {
        const handle = setTimeout(() => {
            setDebouncedSearch(searchInput.trim())
            setPage(0)
        }, 300)
        return () => clearTimeout(handle)
    }, [searchInput])
    const onlineIdsSet = useTeacherPresence(isTeacher ? profile?.id : undefined)
    const onlineIds = Array.from(onlineIdsSet)
    const activeTeacherId = isTeacher && selectedLang ? profile?.id : undefined
    const { data, isLoading: studentsLoading } = useAssignableStudentsQuery({
        teacherId: activeTeacherId,
        page,
        search: debouncedSearch,
        gradeFilter,
        readerFilter,
        onlineFilter,
        onlineIds,
    })
    const students = data?.students ?? []
    const total = data?.total ?? 0
    const pageCount = Math.max(1, Math.ceil(total / ASSIGNABLE_PAGE_SIZE))
    const hasFilters = debouncedSearch.length > 0 || gradeFilter.length > 0 || readerFilter.length > 0 || onlineFilter !== 'offline'
    const { data: savedPassages } = useSavedPassageStatusesQuery(isTeacher ? profile?.id : undefined, selectedLang)
    const queryClient = useQueryClient()
    const cancelMutation = useCancelAssignedAssessmentMutation(profile?.id)
    const chooseLanguage = (chosen: Lang) => {
        if (isTeacher) {
            setSelectedLang(chosen)
            return
        }
        navigate(`/reading/proficiency/assessment/session?lang=${chosen}`)
    }
    const handleCancel = async (assignmentId: string) => {
        const confirmed = await showConfirmation(
            t.cancelConfirmTitle,
            t.cancelConfirmText,
            theme === 'dark',
            'warning',
            t.cancelConfirmButton
        )
        if (!confirmed) return
        try {
            await cancelMutation.mutateAsync(assignmentId)
            showToast(t.cancelSuccessToast, 'success', theme === 'dark')
        } catch (err) {
            console.error('PreAssessment: failed to cancel assignment', err)
        }
    }
    // Opens the passage check screen for this pupil (in this same tab, on the
    // teacher's own account). That screen generates a passage, or loads the
    // one already saved for them, and is where the teacher validates it and
    // then chooses "Start now" (this device) or "Send" (the pupil's own
    // device). The pupil's id/name ride along on the URL so
    // AssessmentSession.tsx can look up their grade level and attribute the
    // result to them.
    const handleOpen = (studentId: string, studentName: string) => {
        if (!selectedLang) return
        navigate(`/reading/proficiency/assessment/session?lang=${selectedLang}&studentId=${studentId}&studentName=${encodeURIComponent(studentName)}`)
    }
    // Throws away the pupil's saved passage so a fresh one can be made.
    // A pupil who is logged in right now may be reading it, so the
    // confirmation says so: they would keep the text they already have, but
    // a reload would find nothing.
    const handleClearPassage = async (studentId: string, studentName: string) => {
        if (!selectedLang) return
        const confirmed = await showConfirmation(
            t.clearConfirmTitle(studentName),
            onlineIdsSet.has(studentId) ? `${t.clearConfirmText} ${t.clearOnlineWarning(studentName)}` : t.clearConfirmText,
            theme === 'dark',
            'warning',
            t.clearConfirmButton
        )
        if (!confirmed) return
        try {
            await deleteSavedPassage(studentId, selectedLang)
            await queryClient.invalidateQueries({ queryKey: ['saved-passages'] })
            showToast(t.clearSuccessToast, 'success', theme === 'dark')
        } catch (err) {
            console.error('PreAssessment: failed to clear the saved passage', err)
        }
    }
    const gradeFilterOptions = [
        { value: '', label: t.gradeFilterAll },
        ...GRADE_OPTIONS.map((n) => ({ value: String(n), label: t.gradeLabel(n) })),
    ]
    const readerFilterOptions = [
        { value: '', label: t.readerFilterAll },
        { value: 'reader', label: t.readerFilterReaders },
        { value: 'non_reader', label: t.readerFilterNonReaders },
    ]
    const onlineFilterOptions = [
        { value: 'offline', label: t.onlineFilterOffline },
        { value: '', label: t.onlineFilterAll },
        { value: 'online', label: t.onlineFilterOnline },
    ]
    // Compact side-by-side option with its own short description — used
    // only in the teacher's languageSectionTeacher below.
    const languageOption = (label: 'fil' | 'en', title: string, desc: string) => {
        const selected = isTeacher && selectedLang === label
        return (
            <button
                onClick={() => chooseLanguage(label)}
                className={`relative flex min-w-[150px] flex-1 flex-col items-start gap-0.5 rounded-xl border-2 px-4 py-2.5 text-left transition-all duration-150 ${
                    selected
                        ? 'border-teal-500 bg-teal-500/10 shadow-sm dark:border-teal-400 dark:bg-teal-400/10'
                        : 'border-gray-900/10 bg-white hover:border-teal-500/40 dark:border-gray-100/10 dark:bg-gray-900 dark:hover:border-teal-400/40'
                }`}
            >
                {selected && (
                    <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-teal-500 text-white dark:bg-teal-400 dark:text-gray-950">
                        <Check size={11} strokeWidth={3} />
                    </span>
                )}
                <span className={`text-sm font-bold ${selected ? 'text-teal-700 dark:text-teal-300' : 'text-gray-900 dark:text-gray-50'}`}>
                    {title}
                </span>
                <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{desc}</span>
            </button>
        )
    }
    const languageSectionTeacher = (
        <section className="relative overflow-hidden rounded-3xl border border-gray-900/5 p-4 shadow-sm transition-colors duration-300 dark:border-gray-100/10 sm:p-5">
            <div className="absolute inset-0 dark:hidden" style={{ background: 'linear-gradient(180deg, #fffdf8 0%, #fff3dd 100%)' }} />
            <div className="absolute inset-0 hidden dark:block" style={{ background: 'linear-gradient(180deg, #0f172a 0%, #020617 100%)' }} />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex shrink-0 items-center gap-3">
                    <Owl mood="confused" size={70} />
                    <div>
                        <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-teal-700 dark:text-teal-300">
                            <Languages size={12} />
                            {t.languageKicker}
                        </span>
                        <h1 className="text-base font-extrabold text-gray-900 dark:text-gray-50 sm:text-lg">
                            {t.languageTitle}
                        </h1>
                        <p className="mt-0.5 max-w-xs text-xs font-medium text-gray-500 dark:text-gray-400">
                            {t.languageDesc}
                        </p>
                    </div>
                </div>
                <div className="flex gap-3 sm:flex-1 sm:justify-end">
                    {languageOption('en', t.englishLabel, t.englishDesc)}
                    {languageOption('fil', t.filipinoLabel, t.filipinoDesc)}
                </div>
            </div>
        </section>
    )
    // Bigger card used only in languageSectionStudent below — same
    // "book-style" shape as MaterialSelection's FOUNDATIONALS cards (big
    // icon chip, title, description, full-width pill CTA at the bottom)
    // rather than the teacher's compact pill, since this is the only
    // content on the student's page and needs to actually fill it.
    const studentLanguageCard = (label: 'fil' | 'en', title: string, desc: string) => (
        <button
            onClick={() => chooseLanguage(label)}
            className="group flex flex-1 cursor-pointer flex-col items-start gap-4 rounded-2xl border-2 border-teal-500/20 bg-white p-6 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-teal-500/40 hover:shadow-xl dark:border-teal-400/20 dark:bg-gray-900 dark:hover:border-teal-400/40"
        >
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-teal-500 text-white shadow-[0_4px_0_0_#0f766e] transition-transform duration-200 group-hover:scale-110 dark:bg-teal-600 dark:shadow-[0_4px_0_0_#115e59]">
                <Languages size={26} />
            </span>
            <div>
                <h3 className="text-xl font-extrabold text-gray-900 dark:text-gray-50">{title}</h3>
                <p className="mt-1 text-sm font-medium text-gray-600 dark:text-gray-400">{desc}</p>
            </div>
            <span className="mt-1 flex w-fit items-center gap-1.5 rounded-full bg-teal-500 px-5 py-2 text-sm font-bold text-white shadow-[0_4px_0_0_#0f766e] transition-transform duration-150 group-hover:translate-x-1 dark:bg-teal-600 dark:shadow-[0_4px_0_0_#115e59]">
                {t.startLabel}
                <ArrowRight size={16} />
            </span>
        </button>
    )
    // Student-only variant: a big hero card (same gradient + radial-glow
    // treatment as MaterialSelection's greeting hero, big bobbing owl)
    // followed by two large language cards — replaces the old shared
    // compact picker on the student side, which left the rest of the page
    // looking empty.
    const languageSectionStudent = (
        <>
            <section className="relative mb-6 overflow-hidden rounded-3xl border border-gray-900/5 p-6 shadow-sm transition-colors duration-300 dark:border-gray-100/10 sm:p-8">
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
                <div className="relative flex flex-col items-center gap-5 sm:flex-row">
                    <Owl mood="neutral" size={88} bob />
                    <div>
                        <span className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wide text-teal-700 dark:text-teal-300 sm:justify-start">
                            <Languages size={14} />
                            {t.languageKicker}
                        </span>
                        <h1 className="mt-1 text-center text-2xl font-extrabold text-gray-900 dark:text-gray-50 sm:text-left sm:text-3xl">
                            {t.languageTitle}
                        </h1>
                        <p className="mt-2 max-w-xl text-center text-base font-medium text-gray-600 dark:text-gray-400 sm:text-left">
                            {t.languageDesc}
                        </p>
                    </div>
                </div>
            </section>
            <div className="grid gap-5 sm:grid-cols-2">
                {studentLanguageCard('en', t.englishLabel, t.englishDesc)}
                {studentLanguageCard('fil', t.filipinoLabel, t.filipinoDesc)}
            </div>
        </>
    )
    const studentRow = (student: (typeof students)[number]) => {
        const online = onlineIdsSet.has(student.id)
        const name = student.full_name || student.username || student.id
        // A passage already generated for this pupil in the chosen language
        // (saved on the server, see savedPassages.ts).
        const savedStatus = savedPassages?.get(student.id)
        return (
            <div
                key={student.id}
                className={`flex items-center justify-between gap-3 rounded-2xl border-2 p-3.5 transition-colors duration-150 ${
                    online
                        ? 'border-gray-900/5 bg-gray-900/[0.02] opacity-60 dark:border-gray-100/5 dark:bg-gray-100/[0.02]'
                        : 'border-gray-900/5 bg-white dark:border-gray-100/10 dark:bg-gray-900'
                }`}
            >
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-extrabold text-gray-900 dark:text-gray-50">{name}</span>
                        {student.grade_level != null && (
                            <span className="shrink-0 rounded-full bg-gray-900/5 px-2.5 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-100/10 dark:text-gray-300">
                                {t.gradeLabel(student.grade_level)}
                            </span>
                        )}
                        {student.is_non_reader && (
                            <span className="shrink-0 rounded-full bg-orange-500/15 px-2.5 py-0.5 text-xs font-semibold text-orange-600 dark:text-orange-400">
                                {t.nonReaderBadge}
                            </span>
                        )}
                        {student.pendingAssignment && (
                            <span className="shrink-0 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                                {t.pendingBadge}
                            </span>
                        )}
                        {savedStatus === 'needs_validation' && (
                            <span
                                title={t.passageUnvalidatedTip}
                                className="flex shrink-0 items-center gap-1 rounded-full bg-violet-500/15 px-2.5 py-0.5 text-xs font-semibold text-violet-700 dark:text-violet-300"
                            >
                                <FileClock size={12} />
                                {t.passageUnvalidatedBadge}
                            </span>
                        )}
                        {savedStatus === 'approved' && (
                            <span
                                title={t.passageReadyTip}
                                className="flex shrink-0 items-center gap-1 rounded-full bg-green-500/15 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:text-green-400"
                            >
                                <FileCheck size={12} />
                                {t.passageReadyBadge}
                            </span>
                        )}
                    </div>
                    {online && (
                        <div className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
                            <Wifi size={12} />
                            {t.onlineNote}
                        </div>
                    )}
                </div>
                {student.pendingAssignment ? (
                    <button
                        onClick={() => handleCancel(student.pendingAssignment!.id)}
                        disabled={cancelMutation.isPending}
                        className="flex shrink-0 cursor-pointer items-center gap-1 rounded-full border-2 border-rose-500/30 px-3 py-1.5 text-xs font-bold text-rose-600 transition-colors duration-150 hover:bg-rose-500/10 disabled:opacity-50 dark:border-rose-400/30 dark:text-rose-400"
                    >
                        <X size={13} />
                        {t.cancelLabel}
                    </button>
                ) : (
                    <div className="flex shrink-0 items-center gap-2">
                        {savedStatus && (
                            <button
                                onClick={() => handleClearPassage(student.id, name)}
                                aria-label={t.clearLabel}
                                title={t.clearLabel}
                                className="flex shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-rose-500/30 p-1.5 text-rose-600 transition-colors duration-150 hover:bg-rose-500/10 dark:border-rose-400/30 dark:text-rose-400"
                            >
                                <Trash2 size={14} />
                            </button>
                        )}
                        <button
                            onClick={() => handleOpen(student.id, name)}
                            className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-teal-500 px-4 py-1.5 text-xs font-bold text-white shadow-[0_3px_0_0_#0f766e] transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_1px_0_0_#0f766e] dark:bg-teal-600 dark:shadow-[0_3px_0_0_#115e59]"
                        >
                            <ArrowRight size={13} />
                            {savedStatus === 'approved' ? t.openReadyLabel : savedStatus === 'needs_validation' ? t.openValidateLabel : t.openNewLabel}
                        </button>
                    </div>
                )}
            </div>
        )
    }
    const studentPickerSection = (
        <section className="relative flex flex-col overflow-hidden rounded-3xl border border-gray-900/5 p-6 shadow-sm transition-colors duration-300 dark:border-gray-100/10 sm:p-8 lg:h-full">
            <div className="absolute inset-0 dark:hidden" style={{ background: 'linear-gradient(180deg, #fffdf8 0%, #fff3dd 100%)' }} />
            <div className="absolute inset-0 hidden dark:block" style={{ background: 'linear-gradient(180deg, #0f172a 0%, #020617 100%)' }} />
            <div className="relative flex flex-1 flex-col lg:min-h-0">
                <div className="shrink-0">
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-teal-700 dark:text-teal-300">
                        <Send size={14} />
                        {t.studentPickerKicker}
                    </div>
                    <h2 className="mt-1 text-xl font-extrabold text-gray-900 dark:text-gray-50">{t.studentPickerTitle}</h2>
                    <p className="mt-2 max-w-xl text-sm font-medium text-gray-600 dark:text-gray-400">{t.studentPickerDesc}</p>
                </div>
                {!selectedLang ? (
                    <div className="mt-5 flex items-center gap-3 rounded-2xl border border-dashed border-gray-900/15 px-4 py-3 dark:border-gray-100/15">
                        <Owl mood="confused" size={36} />
                        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                            {t.pickLanguageFirst}
                        </p>
                    </div>
                ) : (
                    <div className="mt-5 flex flex-1 flex-col gap-6 lg:min-h-0 lg:flex-row">
                        {/* Left column — search + filters, stays put, never scrolls */}
                        <div className="flex shrink-0 flex-col gap-3 lg:w-64">
                            <SearchInput
                                value={searchInput}
                                onChange={setSearchInput}
                                label={t.searchLabel}
                                placeholder={t.searchPlaceholder}
                            />
                            <Select
                                name="assignableGradeFilter"
                                label={t.gradeFilterLabel}
                                options={gradeFilterOptions}
                                value={gradeFilter}
                                onChange={(e) => {
                                    setGradeFilter(e.target.value)
                                    setPage(0)
                                }}
                                selectClassName="px-3.5 py-3"
                            />
                            <Select
                                name="assignableReaderFilter"
                                label={t.readerFilterLabel}
                                options={readerFilterOptions}
                                value={readerFilter}
                                onChange={(e) => {
                                    setReaderFilter(e.target.value as AssignableReaderFilter)
                                    setPage(0)
                                }}
                                selectClassName="px-3.5 py-3"
                            />
                            <Select
                                name="assignableOnlineFilter"
                                label={t.onlineFilterLabel}
                                options={onlineFilterOptions}
                                value={onlineFilter}
                                onChange={(e) => {
                                    setOnlineFilter(e.target.value as AssignableOnlineFilter)
                                    setPage(0)
                                }}
                                selectClassName="px-3.5 py-3"
                            />
                        </div>
                        {/* Right column — the list itself, scrollable; pagination pinned below it */}
                        <div className="flex min-w-0 flex-1 flex-col lg:min-h-0">
                            <div
                                className="lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1 [scrollbar-color:theme(colors.gray.400)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-400/70 [&::-webkit-scrollbar-thumb:hover]:bg-gray-500 [&::-webkit-scrollbar-track]:bg-transparent dark:[&::-webkit-scrollbar-thumb]:bg-gray-500/70 dark:[&::-webkit-scrollbar-thumb:hover]:bg-gray-400"
                            >
                                {studentsLoading ? (
                                    <div role="status" aria-busy="true" className="flex flex-col gap-2.5">
                                        <span className="sr-only">Loading…</span>
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <div
                                                key={i}
                                                className="flex items-center justify-between gap-3 rounded-2xl border-2 border-gray-900/5 bg-white p-3.5 dark:border-gray-100/10 dark:bg-gray-900"
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <Skeleton className="h-3.5 w-28 rounded-full" />
                                                        <Skeleton className="h-3 w-12 rounded-full" />
                                                    </div>
                                                </div>
                                                <div className="flex shrink-0 items-center gap-2">
                                                    <Skeleton className="h-7 w-16 rounded-full" />
                                                    <Skeleton className="h-7 w-16 rounded-full" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : students.length === 0 ? (
                                    <p className="rounded-2xl border border-dashed border-gray-900/15 px-4 py-3 text-sm font-semibold text-gray-500 dark:border-gray-100/15 dark:text-gray-400">
                                        {hasFilters ? t.noResults : t.noStudents}
                                    </p>
                                ) : (
                                    <div className="flex flex-col gap-2.5">
                                        {students.map(studentRow)}
                                    </div>
                                )}
                            </div>
                            <div className="shrink-0">
                                <Pagination page={page} pageCount={pageCount} onPageChange={setPage} className="mt-5" />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </section>
    )
    return (
        <div
            className={`mx-auto flex flex-col px-4 pb-6 pt-2 ${isTeacher ? 'max-w-6xl' : 'max-w-3xl'} ${
                isTeacher ? 'lg:h-[calc(100vh-7.5rem)] lg:overflow-hidden' : ''
            }`}
        >
            <div className="mb-4 flex shrink-0 flex-wrap items-center gap-3">
                <Link
                    to="/reading/proficiency"
                    className="flex items-center gap-1.5 rounded-full border border-gray-900/10 bg-white px-4 py-1.5 text-sm font-bold text-gray-700 shadow-sm transition-colors duration-200 hover:bg-gray-900/5 dark:border-gray-100/10 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-100/10"
                >
                    <ArrowLeft size={16} />
                    {t.back}
                </Link>
            </div>
            {isTeacher ? (
                <div className="flex flex-col gap-4 lg:min-h-0 lg:flex-1">
                    <div className="shrink-0">{languageSectionTeacher}</div>
                    <div className="lg:min-h-0 lg:flex-1">{studentPickerSection}</div>
                </div>
            ) : (
                languageSectionStudent
            )}
        </div>
    )
}
export default ProficiencyAssessmentSelectStudentPage