// File: src/pages/proficiency/MaterialSelection.tsx
import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, ClipboardCheck, Star } from 'lucide-react'
import { Owl } from '../../../components/ui/Owl.tsx'
import { HomeButton } from '../../../components/buttons/HomeButton.tsx'
import { FluentReadingSubNav } from '../components/FluentReadingSubNav.tsx'
import { useAuth } from '../../../contexts/AuthContext.tsx'
import { useProfile } from '../../../hooks/useProfile.ts'
import { useLang } from '../../../contexts/LangContext.tsx'
import type { Lang } from '../../../components/buttons/LangToggle.tsx'
import { BookCover } from './components/BookCover.tsx'
import { IMAGE_SCENES } from './components/sceneImages.ts'
import { ENGLISH_LEVELS, FILIPINO_LEVELS } from '../foundational/data/levels.ts'
import { usePreloadImages } from '../../../hooks/usePreloadImages.ts'
import { OwlLoader } from '../../../components/ui/OwlLoader.tsx'
import { useReadyPassageLangsQuery } from '../pre_assessment/savedPassages.ts'
import { useMyReviewedAttemptsQuery, useUnseenResultCount } from '../my_results/hooks.ts'
// Ported from the earlier prototype's `data/mock.js` BOOKS list (reading-track
// entries only), now paired with the matching Scene name for the cover art.
type Material = {
    id: string
    title: string
    subtitle: string
    grade: number
    lang: 'Filipino' | 'English'
    minutes: number
    scene: 'moon' | 'market' | 'kite'
    coverColor: string
}
const MATERIALS: Material[] = [
    { id: 'the-kite', title: 'The Paper Kite', subtitle: 'Free Reading · English', grade: 3, lang: 'English', minutes: 4, scene: 'kite', coverColor: '#d6547e' },
    { id: 'ang-pusa', title: 'Ang Pusa at ang Buwan', subtitle: 'Isang Maikling Kuwento', grade: 3, lang: 'Filipino', minutes: 4, scene: 'moon', coverColor: '#ff7a59' },
    { id: 'palengke', title: 'Umaga sa Palengke', subtitle: 'Basahin nang Malakas', grade: 3, lang: 'Filipino', minutes: 3, scene: 'market', coverColor: '#ffc64b' },
]
// Foundational-skills levels — same card treatment as MATERIALS, just its
// own row above them since these aren't passages, they're letter/sound
// practice sets. One entry per language track for now; more levels (e.g.
// syllables, sight words) can just be appended here later.
type Foundational = {
    id: string
    title: string
    subtitle: string
    lang: 'Filipino' | 'English'
    scene: 'letters-fil' | 'letters-en'
    coverColor: string
}
// English levels come from the data files (title/subtitle/id); they share the
// Letters & Sounds cover picture until each level gets its own art.
const ENGLISH_COVER_COLORS = ['#e8974a', '#e07a5f', '#5fa8d3', '#6aa84f', '#b07cc6']
const FILIPINO_COVER_COLORS = ['#f0a93c', '#e8774a', '#4fa3a5', '#7bb661', '#b07cc6']
const FOUNDATIONALS: Foundational[] = [
    ...FILIPINO_LEVELS.map((level): Foundational => ({
        id: level.id,
        title: level.title,
        subtitle: level.subtitle,
        lang: 'Filipino',
        scene: 'letters-fil',
        coverColor: FILIPINO_COVER_COLORS[level.level - 1] ?? '#f0a93c',
    })),
    ...ENGLISH_LEVELS.map((level): Foundational => ({
        id: level.id,
        title: level.title,
        subtitle: level.subtitle,
        lang: 'English',
        scene: 'letters-en',
        coverColor: ENGLISH_COVER_COLORS[level.level - 1] ?? '#e8974a',
    })),
]
const STRINGS: Record<Lang, {
    greetingTitle: (name: string) => string
    greetingDesc: string
    preAssessmentKicker: string
    preAssessmentTitle: string
    preAssessmentDesc: string
    preAssessmentCta: string
    langName: Record<Lang, string>
    teacherKicker: string
    teacherDesc: string
    resultsKicker: string
    resultsKickerNew: (n: number) => string
    resultsTitle: string
    resultsDesc: string
    resultsCta: string
    foundationalHeading: string
    foundationalDesc: string
    materialsHeading: string
    materialsTitle: string
    filterLabel: string
    filters: Record<'all' | 'fil' | 'en', string>
    scrollLeft: string
    scrollRight: string
    enter: string
    grade: (n: number) => string
    minutes: (n: number) => string
}> = {
    fil: {
        greetingTitle: (name) => `Magsanay tayo, ${name}!`,
        greetingDesc: 'Piliin ang talatang nais mong pagsanayan. Walang marka dito — tulong lang.',
        preAssessmentKicker: 'Handa na ang talata mo',
        preAssessmentTitle: 'Pagsusuri sa Kasanayan sa Pagbasa',
        preAssessmentDesc: 'Nagpadala ang iyong guro ng talatang babasahin mo nang malakas. Hindi ito iskor, gabay lang ito para sa iyo at sa iyong guro. Pindutin ang buton kapag handa ka na.',
        preAssessmentCta: 'Simulan ang Pagsusuri',
        langName: { fil: 'Filipino', en: 'English' },
        resultsKicker: 'Tapos na',
        resultsKickerNew: (n) => (n === 1 ? 'May bagong resulta' : `${n} bagong resulta`),
        resultsTitle: 'Ang mga resulta ng pagsusuri mo',
        resultsDesc: 'Tingnan kung paano ang naging basa mo, na sinuri ng iyong guro.',
        resultsCta: 'Tingnan ang resulta ko',
        teacherKicker: 'Unang Hakbang',
        teacherDesc: 'Pumili ng mag-aaral, ihanda at suriin ang talata, at ipabasa ito sa iyong device o ipadala sa device ng mag-aaral.',
        foundationalHeading: 'Batayang mga Salita at Tunog',
        foundationalDesc: 'Magsanay sa mga letra, pantig, at simpleng salita bago tumuntong sa mas mahabang talata — mabuting simula para sa bagong nagbabasa.',
        materialsHeading: 'Mga Babasahin',
        materialsTitle: 'Mga Materyales sa Pagbasa',
        filterLabel: 'Salain ayon sa wika',
        filters: { all: 'Lahat ng wika', fil: 'Filipino', en: 'English' },
        scrollLeft: 'Pakaliwa',
        scrollRight: 'Pakanan',
        enter: 'Magsanay',
        grade: (n) => `Baitang ${n}`,
        minutes: (n) => `~${n} minuto`,
    },
    en: {
        greetingTitle: (name) => `Let's practice, ${name}!`,
        greetingDesc: "Pick a passage you'd like to practice. Nothing here is graded — it's just for support.",
        preAssessmentKicker: 'Your passage is ready',
        preAssessmentTitle: 'Reading Assessment',
        preAssessmentDesc: "Your teacher sent you a passage to read aloud. This isn't a score, just guidance for you and your teacher. Tap the button when you're ready.",
        preAssessmentCta: 'Start the Assessment',
        langName: { fil: 'Filipino', en: 'English' },
        resultsKicker: 'All done',
        resultsKickerNew: (n) => (n === 1 ? 'New result' : `${n} new results`),
        resultsTitle: 'Your check-in results',
        resultsDesc: 'See how your reading went, checked by your teacher.',
        resultsCta: 'See my results',
        teacherKicker: 'First Step',
        teacherDesc: "Pick a pupil, prepare and check their passage, then have them read it on your device or send it to theirs.",
        foundationalHeading: 'Foundational Words & Sounds',
        foundationalDesc: "Practice letters, syllables, and simple words before moving to longer passages — a good starting point for new readers.",
        materialsHeading: 'Passages',
        materialsTitle: 'Reading Materials',
        filterLabel: 'Filter by language',
        filters: { all: 'All languages', fil: 'Filipino', en: 'English' },
        scrollLeft: 'Scroll left',
        scrollRight: 'Scroll right',
        enter: 'Practice',
        grade: (n) => `Grade ${n}`,
        minutes: (n) => `~${n} min`,
    },
}
// A sideways shelf: a title line, then a row of cards between two tall arrow buttons.
const ScrollRow: React.FC<{ title?: React.ReactNode; children: React.ReactNode }> = ({ title, children }) => {
    const ref = useRef<HTMLDivElement>(null)
    const outerRef = useRef<HTMLDivElement>(null)
    // The arrows only show when the cards do not all fit. Their columns are always kept
    // (just invisible), so every row lines up the same and the check cannot flip-flop.
    const [overflowing, setOverflowing] = useState(false)
    useEffect(() => {
        const scroller = ref.current
        const outer = outerRef.current
        if (!scroller || !outer) return
        const measure = () => setOverflowing(scroller.scrollWidth > scroller.clientWidth + 1)
        // Watch the row and every card in it (cards can change width without the DOM changing).
        const resize = new ResizeObserver(measure)
        const watchCards = () => {
            resize.disconnect()
            resize.observe(outer)
            Array.from(scroller.children).forEach((card) => resize.observe(card))
            measure()
        }
        watchCards()
        const mutation = new MutationObserver(watchCards)
        mutation.observe(scroller, { childList: true })
        return () => {
            resize.disconnect()
            mutation.disconnect()
        }
    }, [])
    const { lang } = useLang()
    const t = STRINGS[lang]
    const page = (dir: -1 | 1) => {
        const el = ref.current
        if (el) el.scrollBy({ left: dir * Math.max(240, el.clientWidth * 0.7), behavior: 'smooth' })
    }
    // Just a big `<` and `>` with no button around them, one on each side of the cards.
    const arrow =
        'hidden w-20 shrink-0 cursor-pointer items-center justify-center self-stretch rounded-2xl text-gray-700 drop-shadow-md transition-[color,transform] hover:text-teal-500 active:scale-90 dark:text-gray-100 dark:hover:text-teal-300 sm:flex'
    return (
        <div>
            {title && <div className="mb-2 min-w-0">{title}</div>}
            <div ref={outerRef} className="flex items-stretch gap-3 pb-6 pt-2">
                <button type="button" aria-label={t.scrollLeft} aria-hidden={!overflowing} tabIndex={overflowing ? 0 : -1} onClick={() => page(-1)} className={`${arrow} ${overflowing ? '' : 'invisible'}`}>
                    <ChevronLeft className="h-24 w-24" strokeWidth={3.5} />
                </button>
                <div
                    ref={ref}
                    className="flex min-w-0 flex-1 gap-5 overflow-x-auto scroll-smooth py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                    {children}
                </div>
                <button type="button" aria-label={t.scrollRight} aria-hidden={!overflowing} tabIndex={overflowing ? 0 : -1} onClick={() => page(1)} className={`${arrow} ${overflowing ? '' : 'invisible'}`}>
                    <ChevronRight className="h-24 w-24" strokeWidth={3.5} />
                </button>
            </div>
        </div>
    )
}
const TONES = {
    amber: {
        border: 'border-amber-500/25 dark:border-amber-400/25',
        btn: 'bg-amber-500 shadow-[0_4px_0_0_#b45309] active:shadow-[0_1px_0_0_#b45309] dark:bg-amber-600 dark:shadow-[0_4px_0_0_#92400e]',
    },
    teal: {
        border: 'border-gray-900/5 dark:border-gray-100/10',
        btn: 'bg-teal-500 shadow-[0_4px_0_0_#0f766e] active:shadow-[0_1px_0_0_#0f766e] dark:bg-teal-600 dark:shadow-[0_4px_0_0_#115e59]',
    },
}
const ShelfCard: React.FC<{
    tone: keyof typeof TONES
    scene: React.ComponentProps<typeof BookCover>['scene']
    coverColor: string
    title: string
    subtitle: string
    chips: string[]
    cta: string
    onOpen: () => void
}> = ({ tone, scene, coverColor, title, subtitle, chips, cta, onOpen }) => (
    <div
        className={`flex w-64 shrink-0 flex-col overflow-hidden rounded-2xl border-2 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl dark:bg-gray-900 sm:w-72 ${TONES[tone].border}`}
    >
        <div className="h-52">
            <BookCover scene={scene} coverColor={coverColor} title={title} subtitle={subtitle} />
        </div>
        <div className="flex flex-1 flex-col gap-3 p-4">
            <div className="flex flex-wrap gap-2">
                {chips.map((chip) => (
                    <span key={chip} className="rounded-full bg-gray-900/5 px-3 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-100/10 dark:text-gray-300">
                        {chip}
                    </span>
                ))}
            </div>
            <button
                onClick={onOpen}
                className={`mt-auto w-full cursor-pointer rounded-full px-5 py-2 text-sm font-bold text-white transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 active:translate-y-0 ${TONES[tone].btn}`}
            >
                {cta}
            </button>
        </div>
    </div>
)
export const MaterialSelectionPage: React.FC = () => {
    const navigate = useNavigate()
    const { user } = useAuth()
    const { profile } = useProfile()
    const { lang } = useLang()
    const t = STRINGS[lang]
    const [filter, setFilter] = useState<'all' | 'fil' | 'en'>('all')
    const wanted = (l: 'Filipino' | 'English') => filter === 'all' || (filter === 'fil' ? l === 'Filipino' : l === 'English')
    const foundationalGroups = (['English', 'Filipino'] as const)
        .filter(wanted)
        .map((l) => ({ lang: l, items: FOUNDATIONALS.filter((x) => x.lang === l) }))
        .filter((g) => g.items.length > 0)
    const materialsShown = MATERIALS.filter((m) => wanted(m.lang))
    const username = (user?.user_metadata?.username as string | undefined) ?? user?.email?.split('@')[0] ?? 'Guest'
    const isPupil = profile?.role === 'student'
    const { data: readyLangs = [] } = useReadyPassageLangsQuery(isPupil ? profile?.id : undefined)
    const { data: myResults } = useMyReviewedAttemptsQuery(isPupil ? profile?.id : undefined)
    const resultCount = myResults?.length ?? 0
    const unseenResults = useUnseenResultCount(isPupil ? profile?.id : undefined)
    const gradeSection = profile?.grade_level
        ? [t.grade(profile.grade_level), profile.section].filter(Boolean).join(' · ')
        : null
    // Wait for the cover pictures so the shelf appears whole, not one by one.
    const imagesReady = usePreloadImages(Object.values(IMAGE_SCENES))
    if (!imagesReady) return <OwlLoader className="py-32" />
    return (
        <div className="overflow-x-clip">
        <div className="mx-auto max-w-6xl px-4 pb-12 pt-2">
            {profile?.role === 'teacher' ? (
                <div className="no-print mb-4">
                    <FluentReadingSubNav />
                </div>
            ) : (
                <div className="mb-4 flex flex-wrap items-center gap-3">
                    <HomeButton />
                </div>
            )}
            <section className="relative mb-8 overflow-hidden rounded-3xl border border-gray-900/5 p-6 shadow-sm transition-colors duration-300 dark:border-gray-100/10 sm:p-8">
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
                    <Owl mood="proud" size={96} />
                    <div>
                        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-50 sm:text-3xl">
                            {t.greetingTitle(username)}
                        </h1>
                        <p className="mt-1 max-w-xl text-base font-medium text-gray-700 dark:text-gray-200">
                            {t.greetingDesc}
                        </p>
                        {gradeSection && (
                            <span className="mt-2 inline-block rounded-full bg-teal-500/15 px-3 py-1 text-xs font-bold text-teal-700 dark:bg-teal-400/15 dark:text-teal-300">
                                {gradeSection}
                            </span>
                        )}
                    </div>
                </div>
            </section>
            {/* Row 1 — pre-assessment: a single wide card, visually distinct
                from the material cards below since it isn't a passage pick.
                A pupil can't start a check-in on their own: it only shows up
                once their teacher has sent a validated passage, with one
                button per language they have one in. */}
            {(!isPupil || readyLangs.length > 0) && (
                <div className="mb-8 flex w-full flex-col items-start gap-4 rounded-2xl border-2 border-teal-500/20 bg-white p-6 text-left shadow-sm dark:border-teal-400/20 dark:bg-gray-900 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-teal-500 text-white shadow-[0_4px_0_0_#0f766e] dark:bg-teal-600 dark:shadow-[0_4px_0_0_#115e59]">
                            <ClipboardCheck size={26} />
                        </span>
                        <div>
                            <span className="text-xs font-bold uppercase tracking-wide text-teal-700 dark:text-teal-300">
                                {isPupil ? t.preAssessmentKicker : t.teacherKicker}
                            </span>
                            <h3 className="text-lg font-extrabold text-gray-900 dark:text-gray-50">{t.preAssessmentTitle}</h3>
                            <p className="max-w-xl text-sm font-medium text-gray-600 dark:text-gray-400">
                                {isPupil ? t.preAssessmentDesc : t.teacherDesc}
                            </p>
                        </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                        {!isPupil && (
                            <button
                                onClick={() => navigate('/reading/proficiency/assessment')}
                                className="flex cursor-pointer items-center gap-1.5 rounded-full bg-teal-500 px-5 py-2 text-sm font-bold text-white shadow-[0_4px_0_0_#0f766e] transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_1px_0_0_#0f766e] dark:bg-teal-600 dark:shadow-[0_4px_0_0_#115e59]"
                            >
                                {t.preAssessmentCta}
                            </button>
                        )}
                        {readyLangs.map((readyLang) => (
                            <button
                                key={readyLang}
                                onClick={() => navigate(`/reading/proficiency/assessment/session?lang=${readyLang}`)}
                                className="flex cursor-pointer items-center gap-1.5 rounded-full bg-teal-500 px-5 py-2 text-sm font-bold text-white shadow-[0_4px_0_0_#0f766e] transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_1px_0_0_#0f766e] dark:bg-teal-600 dark:shadow-[0_4px_0_0_#115e59]"
                            >
                                {readyLangs.length > 1 ? `${t.preAssessmentCta} · ${t.langName[readyLang]}` : t.preAssessmentCta}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            {/* Check-in results: only for a pupil with at least one reading
                their teacher has confirmed, with a count of the ones they
                haven't opened yet. */}
            {isPupil && resultCount > 0 && (
                <div className="mb-8 flex w-full flex-col items-start gap-4 rounded-2xl border-2 border-amber-500/25 bg-white p-6 text-left shadow-sm dark:border-amber-400/25 dark:bg-gray-900 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-[0_4px_0_0_#b45309] dark:bg-amber-600 dark:shadow-[0_4px_0_0_#92400e]">
                            <Star size={26} />
                        </span>
                        <div>
                            <span className="text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                                {unseenResults > 0 ? t.resultsKickerNew(unseenResults) : t.resultsKicker}
                            </span>
                            <h3 className="text-lg font-extrabold text-gray-900 dark:text-gray-50">{t.resultsTitle}</h3>
                            <p className="max-w-xl text-sm font-medium text-gray-600 dark:text-gray-400">{t.resultsDesc}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate('/reading/proficiency/results')}
                        className="shrink-0 cursor-pointer rounded-full bg-amber-500 px-5 py-2 text-sm font-bold text-white shadow-[0_4px_0_0_#b45309] transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_1px_0_0_#b45309] dark:bg-amber-600 dark:shadow-[0_4px_0_0_#92400e]"
                    >
                        {t.resultsCta}
                    </button>
                </div>
            )}
            {/* Reading Materials: a language filter, a shelf of foundational sets per
                language, then one scrolling shelf of ready-made passages. */}
            <h2 className="mb-1 text-xl font-extrabold text-gray-900 dark:text-gray-50">{t.materialsTitle}</h2>
            <div className="mb-6 flex flex-wrap items-center gap-2" role="group" aria-label={t.filterLabel}>
                {(['all', 'en', 'fil'] as const).map((key) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => setFilter(key)}
                        aria-pressed={filter === key}
                        className={`cursor-pointer rounded-full border-2 px-4 py-1.5 text-sm font-bold transition-colors ${
                            filter === key
                                ? 'border-teal-500 bg-teal-500 text-white dark:border-teal-600 dark:bg-teal-600'
                                : 'border-gray-900/10 bg-white text-gray-700 hover:bg-teal-500/10 dark:border-gray-100/15 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-teal-400/15'
                        }`}
                    >
                        {t.filters[key]}
                    </button>
                ))}
            </div>
            {foundationalGroups.length > 0 && (
                <>
                    <h3 className="mb-1 text-lg font-extrabold text-gray-900 dark:text-gray-50">{t.foundationalHeading}</h3>
                    <p className="mb-4 max-w-2xl text-sm font-medium text-gray-700 dark:text-gray-200">{t.foundationalDesc}</p>
                    {foundationalGroups.map((group) => (
                        <div key={group.lang} className="mb-4">
                            <ScrollRow
                                title={<div className="text-sm font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">{group.lang}</div>}
                            >
                                {group.items.map((item) => (
                                    <ShelfCard
                                        key={item.id}
                                        tone="amber"
                                        scene={item.scene}
                                        coverColor={item.coverColor}
                                        title={item.title}
                                        subtitle={item.subtitle}
                                        chips={[item.lang]}
                                        cta={t.enter}
                                        onOpen={() => navigate(`/reading/proficiency/foundational/${item.id}`)}
                                    />
                                ))}
                            </ScrollRow>
                        </div>
                    ))}
                </>
            )}
            {materialsShown.length > 0 && (
                <>
                    <ScrollRow title={<h3 className="text-lg font-extrabold text-gray-900 dark:text-gray-50">{t.materialsHeading}</h3>}>
                        {materialsShown.map((material) => (
                            <ShelfCard
                                key={material.id}
                                tone="teal"
                                scene={material.scene}
                                coverColor={material.coverColor}
                                title={material.title}
                                subtitle={material.subtitle}
                                chips={[t.grade(material.grade), material.lang, t.minutes(material.minutes)]}
                                cta={t.enter}
                                onOpen={() => navigate(`/reading/proficiency/read/${material.id}`)}
                            />
                        ))}
                    </ScrollRow>
                </>
            )}
        </div>
        </div>
    )
}
export default MaterialSelectionPage