// File: src/pages/admin/recording/select_student/AdminSelectStudent.tsx
// Step 1 of the recording flow: search the fine-tuning roster, pick a
// student, pick a script, confirm. The actual mic-capture flow lives in
// the separate RecordSession page — this page never touches the mic.
// Layout mirrors BeforeAssessment.tsx: a compact status/confirm hero card
// on top, the searchable/filterable picker in its own card below (filter
// column shape borrowed from ProficiencyAssessmentSelectStudent.tsx).
//
// There's no more student-level recording lock to check here — locking
// moved to being per-recording (see RecordingHistory.tsx and
// 20260905041659_move_recording_lock_to_per_recording.sql). A locked
// recording only blocks retaking THAT ONE sentence, which RecordSession.tsx
// now enforces on its own; it never blocks starting a session with a
// student at all, so there's nothing for this picker to filter or warn
// about anymore.
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search as SearchIcon, ShieldAlert, UserRound, Loader2, ArrowRight, Mic, Users, Pencil, ScrollText, Radio } from 'lucide-react'
import { useFinetuneStudentsQuery, type FinetuneStudent } from '../../_hooks/useFinetuneStudents.ts'
import { useConsentFileCountsQuery } from '../../_hooks/useConsentFiles.ts'
import { useReadingSentencesQuery, useReadingSentenceSetsQuery } from '../../_hooks/useReadingSentences.ts'
import { useRecordingSessionsPresence } from '../../_hooks/useRecordingSessions.ts'
import { SearchInput } from '../../../../components/input/SearchInput'
import { Select } from '../../../../components/input/Select'
import { Tooltip } from '../../../../components/ui/Tooltip'
import { Pagination } from '../../../../components/ui/Pagination'
import { AdminSubNav } from '../../_components/AdminSubNav'
import { GenderBadge } from '../../_components/genderDisplay.tsx'
const PAGE_SIZE = 6
type ConsentFilter = '' | 'yes' | 'no'
const TIER_LABELS: Record<string, string> = {
    below: 'Below level',
    on: 'On level',
    above: 'Above level',
}
export default function AdminSelectStudent() {
    const navigate = useNavigate()
    const [search, setSearch] = useState('')
    const [gradeFilter, setGradeFilter] = useState('')
    const [tierFilter, setTierFilter] = useState('')
    const [consentFilter, setConsentFilter] = useState<ConsentFilter>('')
    const [page, setPage] = useState(0)
    const [studentId, setStudentId] = useState('')
    // Was a hardcoded 'g1_2' | 'g3_4' union with a fixed default — sets are
    // admin-editable now (see SentenceScripts.tsx), so this starts empty
    // and gets filled in once the sets have actually loaded (below).
    const [sentenceSet, setSentenceSet] = useState('')
    const { data: studentsData, isLoading: loadingStudents, error: studentsError } = useFinetuneStudentsQuery()
    const students = studentsData ?? []
    // consent_on_file (the DB column) stopped being settable once the
    // manual checkbox was removed from the student form — "has ≥1
    // consent file attached" is the real signal now, both for the badge
    // below, the consent filter, and the default sort order.
    const { data: consentCountsData } = useConsentFileCountsQuery()
    const consentCounts = consentCountsData ?? {}
    // Real-time "who's actively recording right now" map — see
    // useRecordingSessions.ts. Used to badge each row and to disable
    // starting a session with a student someone else already has open.
    const { sessions: recordingSessions } = useRecordingSessionsPresence()
    const { data: setsData, isLoading: loadingSets } = useReadingSentenceSetsQuery()
    const sets = useMemo(() => setsData ?? [], [setsData])
    const { data: sentencesData, isLoading: loadingSentences } = useReadingSentencesQuery()
    const sentencesBySet = sentencesData ?? {}
    // Default the picker to the first script once the sets have loaded,
    // and re-point it if the currently-selected one ever disappears
    // (e.g. deleted on the Sentence Scripts page in another tab).
    useEffect(() => {
        if (sets.length === 0) return
        if (!sentenceSet || !sets.some((s) => s.key === sentenceSet)) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setSentenceSet(sets[0].key)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sets])
    const effectiveSentenceSet = sentenceSet || sets[0]?.key || ''
    // Built from whatever grades actually appear in the roster rather
    // than a fixed 1-6 range, since this roster isn't tied to BasaQuest's
    // own grade-level enrollment the way the proficiency assessment's
    // student list is.
    const gradeOptions = useMemo(() => {
        const grades = Array.from(new Set(students.map((s) => s.grade_level).filter((g): g is number => g != null)))
        grades.sort((a, b) => a - b)
        return [
            { value: '', label: 'All grades' },
            ...grades.map((g) => ({ value: String(g), label: `Grade ${g}` })),
        ]
    }, [students])
    const tierOptions = [
        { value: '', label: 'All tiers' },
        { value: 'below', label: TIER_LABELS.below },
        { value: 'on', label: TIER_LABELS.on },
        { value: 'above', label: TIER_LABELS.above },
    ]
    const consentOptions = [
        { value: '', label: 'All' },
        { value: 'yes', label: 'Consent on file' },
        { value: 'no', label: 'No consent' },
    ]
    // Default order: consent-on-file students first (A-Z), then
    // no-consent students (A-Z) — the DB query already orders by
    // full_name, but consent status only exists in consentCounts (a
    // separate query), so the consent grouping has to be layered on
    // here rather than in the query itself. This runs regardless of
    // which filters are active: when consentFilter is already narrowed
    // to 'yes' or 'no', every row shares the same consent status, so the
    // group split is a no-op and this just falls back to plain
    // alphabetical within that one group.
    const filtered = useMemo(
        () =>
            students
                .filter((s) => {
                    if (!s.full_name.toLowerCase().includes(search.toLowerCase())) return false
                    if (gradeFilter && String(s.grade_level ?? '') !== gradeFilter) return false
                    if (tierFilter && s.reading_tier !== tierFilter) return false
                    if (consentFilter) {
                        const hasConsent = (consentCounts[s.id] ?? 0) > 0
                        if (consentFilter === 'yes' && !hasConsent) return false
                        if (consentFilter === 'no' && hasConsent) return false
                    }
                    return true
                })
                .sort((a, b) => {
                    const aHasConsent = (consentCounts[a.id] ?? 0) > 0
                    const bHasConsent = (consentCounts[b.id] ?? 0) > 0
                    if (aHasConsent !== bHasConsent) return aHasConsent ? -1 : 1
                    return a.full_name.localeCompare(b.full_name)
                }),
        [students, search, gradeFilter, tierFilter, consentFilter, consentCounts],
    )
    const hasFilters = search.length > 0 || gradeFilter.length > 0 || tierFilter.length > 0 || consentFilter !== ''
    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    const paginated = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)
    const selectedStudent: FinetuneStudent | null = useMemo(
        () => students.find((s) => s.id === studentId) ?? null,
        [students, studentId],
    )
    const selectedHasConsent = !!selectedStudent && (consentCounts[selectedStudent.id] ?? 0) > 0
    const activeSessionForSelected = selectedStudent ? recordingSessions.get(selectedStudent.id) : undefined
    // A student someone else currently has RecordSession.tsx open for
    // can't have a second session started against them — see
    // useRecordingSessions.ts. There's no more student-level recording
    // lock to check here (see header comment).
    const canStart =
        !!selectedStudent &&
        selectedHasConsent &&
        !!effectiveSentenceSet &&
        !activeSessionForSelected
    const handleSearchChange = (value: string) => {
        setSearch(value)
        setPage(0)
    }
    const handleStart = () => {
        if (!canStart) return
        navigate(`/admin/recording/session?student=${studentId}&set=${effectiveSentenceSet}`)
    }
    return (
        <div className="mx-auto max-w-6xl px-4 pb-12 pt-2">
            <AdminSubNav />
            {/* Status card — mirrors BeforeAssessment's top "language" hero:
            kicker + title on the left, live controls (script + start) on
            the right. Shows the confirmed selection here instead of it
            living in a bar pinned to the bottom. */}
            <section className="relative mb-6 overflow-hidden rounded-3xl border border-gray-900/5 p-5 shadow-sm transition-colors duration-300 dark:border-gray-100/10 sm:p-7">
                <div className="absolute inset-0 dark:hidden" style={{ background: 'linear-gradient(180deg, #fffdf8 0%, #fff3dd 100%)' }} />
                <div className="absolute inset-0 hidden dark:block" style={{ background: 'linear-gradient(180deg, #0f172a 0%, #020617 100%)' }} />
                <div className="pointer-events-none absolute inset-0 dark:hidden" style={{ background: 'radial-gradient(circle at 88% -20%, rgba(255,198,75,0.4), transparent 55%)' }} />
                <div className="pointer-events-none absolute inset-0 hidden dark:block" style={{ background: 'radial-gradient(circle at 88% -20%, rgba(45,212,191,0.28), transparent 55%)' }} />
                <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-teal-700 dark:text-teal-300">
                            <Mic size={13} />
                            Recording
                        </span>
                        {selectedStudent ? (
                            <>
                                <h1 className="mt-1 truncate text-2xl font-extrabold text-gray-900 dark:text-gray-50">
                                    {selectedStudent.full_name}
                                </h1>
                                {!selectedHasConsent && (
                                    <p className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-red-600 dark:text-red-400">
                                        <ShieldAlert size={14} className="shrink-0" />
                                        No consent file on record — attach one on the Students page first.
                                    </p>
                                )}
                                {activeSessionForSelected && (
                                    <p className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-sky-600 dark:text-sky-400">
                                        <Radio size={14} className="shrink-0" />
                                        Currently being recorded by {activeSessionForSelected.adminName} — try again once
                                        they're done.
                                    </p>
                                )}
                            </>
                        ) : (
                            <>
                                <h1 className="mt-1 text-2xl font-extrabold text-gray-900 dark:text-gray-50">
                                    No student selected
                                </h1>
                                <p className="mt-1.5 text-sm font-medium text-gray-500 dark:text-gray-400">
                                    Pick a student below to begin.
                                </p>
                            </>
                        )}
                    </div>
                    <div className="flex shrink-0 flex-col items-stretch gap-3 sm:flex-row sm:items-end">
                        <div className="w-full sm:w-64">
                            <Select
                                name="sentence_set"
                                label="Script"
                                value={effectiveSentenceSet}
                                onChange={(e) => setSentenceSet(e.target.value)}
                                disabled={loadingSets || loadingSentences || sets.length === 0}
                                options={sets.map((set) => ({
                                    value: set.key,
                                    label: `${set.label} (${(sentencesBySet[set.key] ?? []).length} sentences)`,
                                }))}
                            />
                        </div>
                        <button
                            type="button"
                            onClick={handleStart}
                            disabled={!canStart}
                            className="flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-orange-500 px-6 py-3 text-sm font-bold text-white shadow-[0_3px_0_0_#c2410c] transition-[transform,box-shadow] duration-150 active:translate-y-0.5 active:shadow-[0_1px_0_0_#c2410c] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none dark:bg-orange-600"
                        >
                            Start recording <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            </section>
            {/* Student picker — same shape as BeforeAssessment's "Select a
            Student" section: kicker + title, then a filter column next to
            a scrolling list (layout borrowed from
            ProficiencyAssessmentSelectStudent.tsx's studentPickerSection). */}
            <section className="relative overflow-hidden rounded-3xl border border-gray-900/5 p-5 shadow-sm transition-colors duration-300 dark:border-gray-100/10 sm:p-7">
                <div className="absolute inset-0 dark:hidden" style={{ background: 'linear-gradient(180deg, #fffdf8 0%, #fff3dd 100%)' }} />
                <div className="absolute inset-0 hidden dark:block" style={{ background: 'linear-gradient(180deg, #0f172a 0%, #020617 100%)' }} />
                <div className="relative">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-teal-700 dark:text-teal-300">
                                <Users size={14} />
                                Choose a student
                            </div>
                            <h2 className="mt-1 text-xl font-extrabold text-gray-900 dark:text-gray-50">Select a student</h2>
                            <p className="mt-1.5 text-sm font-medium text-gray-600 dark:text-gray-400">
                                Search and pick who you're recording. Manage the roster itself from the Students page.
                            </p>
                        </div>
                        {/* Quick escape hatch to the script editor — most admins
                        land here first, so this saves a trip through AdminSubNav
                        when they actually want to edit a script's sentences. */}
                        <button
                            type="button"
                            onClick={() => navigate('/admin/recording/scripts')}
                            className="flex shrink-0 items-center gap-1.5 rounded-full border border-gray-900/10 bg-white px-3.5 py-1.5 text-xs font-bold text-gray-600 shadow-sm transition-colors duration-150 hover:bg-gray-900/5 dark:border-gray-100/10 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-100/10"
                        >
                            <ScrollText size={13} />
                            Manage scripts
                        </button>
                    </div>
                    {studentsError && (
                        <p className="mt-3 text-sm font-semibold text-red-600 dark:text-red-400">
                            Couldn't load students: {studentsError instanceof Error ? studentsError.message : 'Something went wrong.'}
                        </p>
                    )}
                    <div className="mt-5 flex flex-col gap-6 lg:flex-row">
                        {/* Left column — search + filters, stays put */}
                        <div className="flex shrink-0 flex-col gap-3 lg:w-64">
                            <SearchInput value={search} onChange={handleSearchChange} label="Search" placeholder="Name…" />
                            <Select
                                name="gradeFilter"
                                label="Grade"
                                options={gradeOptions}
                                value={gradeFilter}
                                onChange={(e) => {
                                    setGradeFilter(e.target.value)
                                    setPage(0)
                                }}
                            />
                            <Select
                                name="tierFilter"
                                label="Reading tier"
                                options={tierOptions}
                                value={tierFilter}
                                onChange={(e) => {
                                    setTierFilter(e.target.value)
                                    setPage(0)
                                }}
                            />
                            <Select
                                name="consentFilter"
                                label="Consent"
                                options={consentOptions}
                                value={consentFilter}
                                onChange={(e) => {
                                    setConsentFilter(e.target.value as ConsentFilter)
                                    setPage(0)
                                }}
                            />
                        </div>
                        {/* Right column — the list itself */}
                        <div className="min-w-0 flex-1">
                            {loadingStudents ? (
                                <div className="flex items-center justify-center py-14 text-sm text-gray-500 dark:text-gray-400">
                                    <Loader2 size={16} className="mr-2 animate-spin" /> Loading students…
                                </div>
                            ) : filtered.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-gray-900/15 p-10 text-center text-sm text-gray-500 dark:border-gray-100/15 dark:text-gray-400">
                                    <SearchIcon size={20} className="mx-auto mb-2 opacity-50" />
                                    {students.length === 0
                                        ? 'No students yet. Add one on the Students page.'
                                        : hasFilters
                                            ? 'No matches. Try different filters.'
                                            : 'No matches. Try a different name.'}
                                </div>
                            ) : (
                                <>
                                    <div className="flex flex-col gap-2.5">
                                        {paginated.map((s) => {
                                            const isSelected = s.id === studentId
                                            const hasConsent = (consentCounts[s.id] ?? 0) > 0
                                            const activeSession = recordingSessions.get(s.id)
                                            return (
                                                <div
                                                    key={s.id}
                                                    className={`flex w-full items-center gap-3 rounded-2xl border-2 bg-white p-4 transition-colors duration-150 dark:bg-gray-900 ${
                                                        isSelected
                                                            ? 'border-teal-400 ring-2 ring-teal-400/40'
                                                            : 'border-gray-900/5 dark:border-gray-100/10'
                                                    }`}
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={() => setStudentId(s.id)}
                                                        className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
                                                    >
                                                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-500/15 text-base font-extrabold text-teal-600 dark:text-teal-400">
                                                            {s.full_name?.[0]?.toUpperCase() ?? <UserRound size={18} />}
                                                        </span>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <span className="font-bold text-gray-900 dark:text-gray-50">{s.full_name}</span>
                                                                {s.grade_level != null && (
                                                                    <span className="rounded-full bg-gray-900/5 px-2 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-100/10 dark:text-gray-300">
                                                                        Grade {s.grade_level}
                                                                    </span>
                                                                )}
                                                                <GenderBadge gender={s.gender} />
                                                                {s.reading_tier && (
                                                                    <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-xs font-semibold text-sky-600 dark:text-sky-400">
                                                                        {TIER_LABELS[s.reading_tier] ?? s.reading_tier}
                                                                    </span>
                                                                )}
                                                                <span
                                                                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                                                        hasConsent
                                                                            ? 'bg-green-500/15 text-green-600 dark:text-green-400'
                                                                            : 'bg-red-500/15 text-red-600 dark:text-red-400'
                                                                    }`}
                                                                >
                                                                    {hasConsent ? 'consent on file' : 'no consent'}
                                                                </span>
                                                                {activeSession && (
                                                                    <span className="flex items-center gap-1 rounded-full bg-sky-500/15 px-2 py-0.5 text-xs font-semibold text-sky-600 dark:text-sky-400">
                                                                        <Radio size={11} /> recording — {activeSession.adminName}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </button>
                                                    {/* Jumps straight to this student's edit drawer on the
                                                    Students page — FinetuneStudentList.tsx watches for a
                                                    ?edit=<id> param and auto-opens it. */}
                                                    <Tooltip label="Edit roster entry">
                                                        <button
                                                            type="button"
                                                            aria-label="Edit roster entry"
                                                            onClick={() => navigate(`/admin/students?edit=${s.id}`)}
                                                            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl text-gray-500 transition-colors duration-200 hover:bg-gray-900/5 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-100/10 dark:hover:text-gray-50"
                                                        >
                                                            <Pencil size={16} />
                                                        </button>
                                                    </Tooltip>
                                                </div>
                                            )
                                        })}
                                    </div>
                                    <Pagination page={page} pageCount={pageCount} onPageChange={setPage} className="mt-5" />
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}