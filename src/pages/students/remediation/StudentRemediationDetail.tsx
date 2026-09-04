// File: StudentRemediationDetail.tsx
// File: src/pages/students/remediation/StudentRemediationDetail.tsx
//
// All remediation material ever generated for ONE pupil, newest first —
// reached by clicking a row on RemediationList.tsx, or via the "View
// Pupil's Remediation List" link on AttemptResults.tsx right after
// generating a new entry.
//
// Each card is one SNAPSHOT (one remediation_materials row) — its own
// generation date, the source reading's language/passage title (if the
// source attempt still exists), the dominant error type at generation
// time, and the full tallied word list. Cards are intentionally NOT
// merged/deduplicated across generations — two separate generations
// from the same attempt show up as two separate cards.
//
// START REMEDIATION (this pass): each card now has a "Start
// Remediation" button that opens the teacher-led drill session
// (RemediationSession.tsx, under session/) for that one material's
// words. A practiced-count badge and a "last practiced" line (from
// last_practiced_at, updated whenever a session saves progress against
// this material) show at a glance whether/how much of a piece of
// material has actually been drilled yet.
//
// DELETE: a teacher can remove a single generated entry via the trash
// button on each card — confirmed first via showConfirmation.
import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Calendar, CheckCircle2, PlayCircle, Sparkles, Trash2 } from 'lucide-react'
import { useLang } from '../../../contexts/LangContext'
import { useTheme } from '../../../contexts/ThemeContext'
import { useProfile } from '../../../hooks/useProfile'
import { showConfirmation, showToast } from '../../../helpers/swalHelpers'
import { Skeleton } from '../../../components/ui/Skeleton'
import { Owl } from '../../../components/ui/Owl'
import type { Lang } from '../../../components/buttons/LangToggle'
import { useStudentProfileQuery } from '../review/hooks'
import { ERROR_TYPE_COLOR } from '../review/features/attemptWordReviewHelpers'
import {
    readPracticed,
    useDeleteRemediationMaterialMutation,
    useStudentRemediationMaterialsQuery,
    type RemediationMaterial,
} from './hooks'
const STRINGS: Record<Lang, {
    loading: string
    back: string
    notFoundTitle: string
    notFoundDesc: string
    unnamedStudent: string
    gradeLabel: (n: number) => string
    emptyTitle: string
    emptyDesc: string
    generatedOn: string
    fromReading: (title: string) => string
    filipinoLabel: string
    englishLabel: string
    dominantLabel: (type: string) => string
    wordCount: (n: number) => string
    practicedBadge: (count: number, total: number) => string
    lastPracticed: (date: string) => string
    notPracticedYet: string
    startButton: string
    deleteAria: string
    deleteConfirmTitle: string
    deleteConfirmText: string
    deleteConfirmButton: string
    deletedToast: string
    deleteErrorGeneric: string
}> = {
    fil: {
        loading: 'Kinukuha ang remediation material...',
        back: 'Bumalik sa Remediation',
        notFoundTitle: 'Hindi Nahanap',
        notFoundDesc: 'Hindi na available ang estudyanteng ito.',
        unnamedStudent: 'Estudyante',
        gradeLabel: (n) => `Baitang ${n}`,
        emptyTitle: 'Wala pang remediation material dito.',
        emptyDesc: 'Gumawa ng bago mula sa resulta ng isang pagbasa.',
        generatedOn: 'Ginawa noong',
        fromReading: (title) => `Mula sa: ${title}`,
        filipinoLabel: 'Filipino',
        englishLabel: 'English',
        dominantLabel: (type) => `Pangunahing kahinaan: ${type}`,
        wordCount: (n) => `${n} salita`,
        practicedBadge: (count, total) => `${count}/${total} nasanay`,
        lastPracticed: (date) => `Huling sinanay: ${date}`,
        notPracticedYet: 'Hindi pa sinasanay',
        startButton: 'Simulan ang Remediation',
        deleteAria: 'Burahin ang materyal na ito',
        deleteConfirmTitle: 'Burahin ang remediation material na ito?',
        deleteConfirmText: 'Permanente itong mabubura. Hindi na ito maibabalik.',
        deleteConfirmButton: 'Oo, burahin',
        deletedToast: 'Nabura ang remediation material.',
        deleteErrorGeneric: 'Hindi nabura ang materyal. Subukan ulit.',
    },
    en: {
        loading: 'Loading remediation material...',
        back: 'Back to Remediation',
        notFoundTitle: 'Not Found',
        notFoundDesc: "This pupil isn't available anymore.",
        unnamedStudent: 'Student',
        gradeLabel: (n) => `Grade ${n}`,
        emptyTitle: 'No remediation material here yet.',
        emptyDesc: "Generate one from a reading's results page.",
        generatedOn: 'Generated on',
        fromReading: (title) => `From: ${title}`,
        filipinoLabel: 'Filipino',
        englishLabel: 'English',
        dominantLabel: (type) => `Dominant weakness: ${type}`,
        wordCount: (n) => `${n} word${n === 1 ? '' : 's'}`,
        practicedBadge: (count, total) => `${count}/${total} practiced`,
        lastPracticed: (date) => `Last practiced: ${date}`,
        notPracticedYet: 'Not practiced yet',
        startButton: 'Start Remediation',
        deleteAria: 'Delete this material',
        deleteConfirmTitle: 'Delete this remediation material?',
        deleteConfirmText: "This can't be undone.",
        deleteConfirmButton: 'Yes, delete',
        deletedToast: 'Remediation material was deleted.',
        deleteErrorGeneric: "Couldn't delete this material. Please try again.",
    },
}
function formatPHDate(isoString: string): string {
    return new Intl.DateTimeFormat('en-PH', {
        timeZone: 'Asia/Manila',
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(isoString))
}
function MaterialCard({
                          material,
                          t,
                          onDelete,
                          isDeleting,
                          onStart,
                      }: {
    material: RemediationMaterial
    t: (typeof STRINGS)['en']
    onDelete: () => void
    isDeleting: boolean
    onStart: () => void
}) {
    const practicedCount = material.words.filter(readPracticed).length
    return (
        <div className="rounded-3xl border border-gray-900/5 bg-white p-5 shadow-sm dark:border-gray-100/10 dark:bg-gray-900 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400">
                        <Calendar size={13} />
                        {t.generatedOn} {formatPHDate(material.created_at)}
                    </div>
                    {material.passage_title && (
                        <div className="mt-1 text-sm font-semibold text-gray-700 dark:text-gray-300">
                            {t.fromReading(material.passage_title)}
                        </div>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-gray-900/5 px-2.5 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-100/10 dark:text-gray-300">
                            {material.language === 'fil' ? t.filipinoLabel : t.englishLabel}
                        </span>
                        {material.dominant_error_type && (
                            <span className="rounded-full bg-purple-500/15 px-2.5 py-0.5 text-xs font-bold text-purple-700 dark:text-purple-300">
                                {t.dominantLabel(material.dominant_error_type)}
                            </span>
                        )}
                        <span className="rounded-full bg-gray-900/5 px-2.5 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-100/10 dark:text-gray-300">
                            {t.wordCount(material.word_count)}
                        </span>
                        <span className="flex items-center gap-1 rounded-full bg-teal-500/15 px-2.5 py-0.5 text-xs font-bold text-teal-700 dark:bg-teal-400/15 dark:text-teal-300">
                            <CheckCircle2 size={12} />
                            {t.practicedBadge(practicedCount, material.word_count)}
                        </span>
                    </div>
                    <div className="mt-1.5 text-[11px] font-semibold text-gray-400 dark:text-gray-500">
                        {material.last_practiced_at ? t.lastPracticed(formatPHDate(material.last_practiced_at)) : t.notPracticedYet}
                    </div>
                </div>
                <button
                    type="button"
                    aria-label={t.deleteAria}
                    onClick={onDelete}
                    disabled={isDeleting}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors duration-200 hover:bg-red-500/10 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                >
                    <Trash2 size={15} />
                </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
                {material.words.map((entry, i) => (
                    <span
                        key={`${entry.word}-${entry.errorType}-${i}`}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold ${ERROR_TYPE_COLOR[entry.errorType]} ${
                            readPracticed(entry) ? 'opacity-60' : ''
                        }`}
                    >
                        {entry.word}
                        {entry.count > 1 && <span className="opacity-70">×{entry.count}</span>}
                        {readPracticed(entry) && <CheckCircle2 size={13} />}
                    </span>
                ))}
            </div>
            <div className="mt-4 flex justify-end">
                <button
                    type="button"
                    onClick={onStart}
                    className="flex items-center gap-2 rounded-full bg-purple-500 px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_0_0_#6d28d9] transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_1px_0_0_#6d28d9] dark:bg-purple-600 dark:shadow-[0_4px_0_0_#5b21b6]"
                >
                    <PlayCircle size={17} />
                    {t.startButton}
                </button>
            </div>
        </div>
    )
}
export const StudentRemediationDetail: React.FC = () => {
    const { studentId } = useParams<{ studentId: string }>()
    const navigate = useNavigate()
    const { lang } = useLang()
    const { theme } = useTheme()
    const { profile } = useProfile()
    const t = STRINGS[lang]
    const { data: student, isLoading: studentLoading } = useStudentProfileQuery(studentId)
    const { data: materials, isLoading: materialsLoading, error } = useStudentRemediationMaterialsQuery(studentId)
    const deleteMaterial = useDeleteRemediationMaterialMutation(profile?.id)
    const handleDelete = async (materialId: string) => {
        const confirmed = await showConfirmation(
            t.deleteConfirmTitle,
            t.deleteConfirmText,
            theme === 'dark',
            'warning',
            t.deleteConfirmButton
        )
        if (!confirmed || !studentId) return
        try {
            await deleteMaterial.mutateAsync({ id: materialId, studentId })
            showToast(t.deletedToast, 'success', theme === 'dark')
        } catch (err) {
            console.error('StudentRemediationDetail: failed to delete remediation material', err)
            showToast(t.deleteErrorGeneric, 'error', theme === 'dark')
        }
    }
    const isLoading = studentLoading || materialsLoading
    if (isLoading) {
        return (
            <div className="mx-auto max-w-4xl px-4 pb-12 pt-2">
                <button
                    type="button"
                    onClick={() => navigate('/students/remediation')}
                    className="mb-6 flex items-center gap-1.5 rounded-full border border-gray-900/10 bg-white px-4 py-1.5 text-sm font-bold text-gray-700 shadow-sm dark:border-gray-100/10 dark:bg-gray-900 dark:text-gray-200"
                >
                    <ArrowLeft size={16} />
                    {t.back}
                </button>
                <div role="status" aria-busy="true" className="flex flex-col gap-3">
                    <span className="sr-only">{t.loading}</span>
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="rounded-3xl border border-gray-900/5 p-5 dark:border-gray-100/10 sm:p-6">
                            <Skeleton className="h-3 w-40 rounded-full" />
                            <div className="mt-4 flex flex-wrap gap-2">
                                {Array.from({ length: 5 }).map((_, j) => (
                                    <Skeleton key={j} className="h-8 w-20 rounded-full" />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    }
    if (!studentId || (!studentLoading && !student) || error) {
        return (
            <div className="mx-auto max-w-4xl px-4 pb-12 pt-2">
                <button
                    type="button"
                    onClick={() => navigate('/students/remediation')}
                    className="mb-6 flex items-center gap-1.5 rounded-full border border-gray-900/10 bg-white px-4 py-1.5 text-sm font-bold text-gray-700 shadow-sm dark:border-gray-100/10 dark:bg-gray-900 dark:text-gray-200"
                >
                    <ArrowLeft size={16} />
                    {t.back}
                </button>
                <section className="flex flex-col items-center gap-3 rounded-3xl border border-gray-900/5 p-8 text-center shadow-sm dark:border-gray-100/10">
                    <Owl mood="neutral" size={64} />
                    <h2 className="text-xl font-extrabold text-gray-900 dark:text-gray-50">{t.notFoundTitle}</h2>
                    <p className="max-w-sm text-sm font-medium text-gray-600 dark:text-gray-400">{t.notFoundDesc}</p>
                </section>
            </div>
        )
    }
    const studentName = student?.full_name || student?.username || t.unnamedStudent
    const materialList = materials ?? []
    return (
        <div className="mx-auto max-w-4xl px-4 pb-12 pt-2">
            <button
                type="button"
                onClick={() => navigate('/students/remediation')}
                className="mb-4 flex items-center gap-1.5 rounded-full border border-gray-900/10 bg-white px-4 py-1.5 text-sm font-bold text-gray-700 shadow-sm transition-colors duration-200 hover:bg-gray-900/5 dark:border-gray-100/10 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-100/10"
            >
                <ArrowLeft size={16} />
                {t.back}
            </button>
            <section className="relative mb-6 overflow-hidden rounded-3xl border border-gray-900/5 p-6 shadow-sm dark:border-gray-100/10 sm:p-8">
                <div className="absolute inset-0 dark:hidden" style={{ background: 'linear-gradient(180deg, #fdf4ff 0%, #f3e8ff 100%)' }} />
                <div className="absolute inset-0 hidden dark:block" style={{ background: 'linear-gradient(180deg, #0f172a 0%, #020617 100%)' }} />
                <div className="relative flex flex-wrap items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400">
                        <Sparkles size={20} />
                    </span>
                    <div>
                        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-50">{studentName}</h1>
                        {student?.grade_level != null && (
                            <p className="mt-0.5 text-sm font-semibold text-gray-600 dark:text-gray-400">{t.gradeLabel(student.grade_level)}</p>
                        )}
                    </div>
                </div>
            </section>
            {materialList.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-gray-900/10 bg-white p-10 text-center dark:border-gray-100/10 dark:bg-gray-900">
                    <p className="text-base font-extrabold text-gray-900 dark:text-gray-50">{t.emptyTitle}</p>
                    <p className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-300">{t.emptyDesc}</p>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {materialList.map((material) => (
                        <MaterialCard
                            key={material.id}
                            material={material}
                            t={t}
                            onDelete={() => handleDelete(material.id)}
                            isDeleting={deleteMaterial.isPending && deleteMaterial.variables?.id === material.id}
                            onStart={() => navigate(`/students/remediation/${material.student_id}/session/${material.id}`)}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
export default StudentRemediationDetail