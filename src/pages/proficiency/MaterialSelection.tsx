// File: src/pages/proficiency/MaterialSelection.tsx
import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ClipboardCheck } from 'lucide-react'
import { Owl } from '../../components/ui/Owl'
import { useAuth } from '../../contexts/AuthContext'
import { useProfile } from '../../hooks/useProfile'
import { useLang } from '../../contexts/LangContext'
import type { Lang } from '../../components/buttons/LangToggle'
import { BookCover } from './components/BookCover'
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
    { id: 'ang-pusa', title: 'Ang Pusa at ang Buwan', subtitle: 'Isang Maikling Kuwento', grade: 3, lang: 'Filipino', minutes: 4, scene: 'moon', coverColor: '#ff7a59' },
    { id: 'palengke', title: 'Umaga sa Palengke', subtitle: 'Basahin nang Malakas', grade: 3, lang: 'Filipino', minutes: 3, scene: 'market', coverColor: '#ffc64b' },
    { id: 'the-kite', title: 'The Paper Kite', subtitle: 'Free Reading · English', grade: 3, lang: 'English', minutes: 4, scene: 'kite', coverColor: '#d6547e' },
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
const FOUNDATIONALS: Foundational[] = [
    { id: 'letters-fil', title: 'Mga Titik at Tunog', subtitle: 'Filipino · Antas 1', lang: 'Filipino', scene: 'letters-fil', coverColor: '#f0a93c' },
    { id: 'letters-en', title: 'Letters & Sounds', subtitle: 'English · Level 1', lang: 'English', scene: 'letters-en', coverColor: '#e8974a' },
]
const STRINGS: Record<Lang, {
    back: string
    greetingTitle: (name: string) => string
    greetingDesc: string
    preAssessmentKicker: string
    preAssessmentTitle: string
    preAssessmentDesc: string
    preAssessmentCta: string
    foundationalHeading: string
    foundationalDesc: string
    materialsHeading: string
    enter: string
    grade: (n: number) => string
    minutes: (n: number) => string
}> = {
    fil: {
        back: 'Tahanan',
        greetingTitle: (name) => `Magsanay tayo, ${name}!`,
        greetingDesc: 'Piliin ang talatang nais mong pagsanayan. Walang marka dito — tulong lang.',
        preAssessmentKicker: 'Unang Hakbang',
        preAssessmentTitle: 'Pagsusuri sa Kasanayan sa Pagbasa',
        preAssessmentDesc: 'Bago pumili ng materyales, alamin muna natin kung gaano ka kahusay magbasa ngayon — hindi ito iskor, gabay lang ito para sa iyo at sa iyong guro.',
        preAssessmentCta: 'Simulan ang Pagsusuri',
        foundationalHeading: 'Batayang mga Salita at Tunog',
        foundationalDesc: 'Magsanay sa mga letra, pantig, at simpleng salita bago tumuntong sa mas mahabang talata — mabuting simula para sa bagong nagbabasa.',
        materialsHeading: 'O piliin ang isang materyales',
        enter: 'Magsanay',
        grade: (n) => `Baitang ${n}`,
        minutes: (n) => `~${n} minuto`,
    },
    en: {
        back: 'Home',
        greetingTitle: (name) => `Let's practice, ${name}!`,
        greetingDesc: "Pick a passage you'd like to practice. Nothing here is graded — it's just for support.",
        preAssessmentKicker: 'First Step',
        preAssessmentTitle: 'Reading Skills Check-In',
        preAssessmentDesc: "Before picking a passage, let's see how you're reading right now — this isn't a score, just guidance for you and your teacher.",
        preAssessmentCta: 'Start the Check-In',
        foundationalHeading: 'Foundational Words & Sounds',
        foundationalDesc: "Practice letters, syllables, and simple words before moving to longer passages — a good starting point for new readers.",
        materialsHeading: 'Or pick a reading material',
        enter: 'Practice',
        grade: (n) => `Grade ${n}`,
        minutes: (n) => `~${n} min`,
    },
}
export const MaterialSelection: React.FC = () => {
    const navigate = useNavigate()
    const { user } = useAuth()
    const { profile } = useProfile()
    const { lang } = useLang()
    const t = STRINGS[lang]
    const username = (user?.user_metadata?.username as string | undefined) ?? user?.email?.split('@')[0] ?? 'Guest'
    const gradeSection = profile?.grade_level
        ? [t.grade(profile.grade_level), profile.section].filter(Boolean).join(' · ')
        : null
    return (
        <div className="mx-auto max-w-6xl px-4 pb-12 pt-2">
            <div className="mb-4 flex flex-wrap items-center gap-3">
                <Link
                    to="/home"
                    className="flex items-center gap-1.5 rounded-full border border-gray-900/10 bg-white px-4 py-1.5 text-sm font-bold text-gray-700 shadow-sm transition-colors duration-200 hover:bg-gray-900/5 dark:border-gray-100/10 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-100/10"
                >
                    <ArrowLeft size={16} />
                    {t.back}
                </Link>
            </div>
            <section className="relative mb-8 overflow-hidden rounded-3xl border border-gray-900/5 p-6 shadow-sm transition-colors duration-300 dark:border-gray-100/10 sm:p-8">
                <div
                    className="absolute inset-0 dark:hidden"
                    style={{ background: 'linear-gradient(180deg, #fffdf8 0%, #fff3dd 100%)' }}
                />
                <div
                    className="absolute inset-0 hidden dark:block"
                    style={{ background: 'linear-gradient(180deg, #0f172a 0%, #020617 100%)' }}
                />
                <div className="relative flex flex-col items-center gap-5 sm:flex-row">
                    <Owl mood="greeting" size={72} bob />
                    <div>
                        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-50 sm:text-3xl">
                            {t.greetingTitle(username)}
                        </h1>
                        <p className="mt-1 max-w-xl text-base font-medium text-gray-600 dark:text-gray-400">
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
                from the material cards below since it isn't a passage pick */}
            <button
                onClick={() => navigate('/reading/proficiency/assessment')}
                className="group mb-8 flex w-full cursor-pointer flex-col items-start gap-4 rounded-2xl border-2 border-teal-500/20 bg-teal-500/5 p-6 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-teal-500/40 hover:shadow-md dark:border-teal-400/20 dark:bg-teal-400/5 dark:hover:border-teal-400/40 sm:flex-row sm:items-center sm:justify-between"
            >
                <div className="flex items-center gap-4">
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-teal-500 text-white shadow-[0_4px_0_0_#0f766e] dark:bg-teal-600 dark:shadow-[0_4px_0_0_#115e59]">
                        <ClipboardCheck size={26} />
                    </span>
                    <div>
                        <span className="text-xs font-bold uppercase tracking-wide text-teal-700 dark:text-teal-300">
                            {t.preAssessmentKicker}
                        </span>
                        <h3 className="text-lg font-extrabold text-gray-900 dark:text-gray-50">{t.preAssessmentTitle}</h3>
                        <p className="max-w-xl text-sm font-medium text-gray-600 dark:text-gray-400">{t.preAssessmentDesc}</p>
                    </div>
                </div>
                <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-teal-500 px-5 py-2 text-sm font-bold text-white shadow-[0_4px_0_0_#0f766e] transition-transform duration-150 group-hover:translate-x-1 dark:bg-teal-600 dark:shadow-[0_4px_0_0_#115e59]">
                    {t.preAssessmentCta}
                </span>
            </button>
            {/* Row 2 — foundational words/sounds: its own row of book-style
                cards (one per language/level), same shape as the materials
                grid below, so multiple entries can sit side by side */}
            <h2 className="mb-1 text-xl font-extrabold text-gray-900 dark:text-gray-50">{t.foundationalHeading}</h2>
            <p className="mb-4 max-w-2xl text-sm font-medium text-gray-600 dark:text-gray-400">{t.foundationalDesc}</p>
            <div className="mb-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {FOUNDATIONALS.map((item) => (
                    <div
                        key={item.id}
                        className="flex flex-col overflow-hidden rounded-2xl border-2 border-amber-500/25 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl dark:border-amber-400/25 dark:bg-gray-900"
                    >
                        <div className="h-56">
                            <BookCover scene={item.scene} coverColor={item.coverColor} title={item.title} subtitle={item.subtitle} />
                        </div>
                        <div className="flex flex-1 flex-col gap-3 p-4">
                            <div className="flex flex-wrap gap-2">
                                <span className="rounded-full bg-gray-900/5 px-3 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-100/10 dark:text-gray-300">
                                    {item.lang}
                                </span>
                            </div>
                            <button
                                onClick={() => navigate(`/reading/proficiency/foundational/${item.id}`)}
                                className="w-full cursor-pointer rounded-full bg-amber-500 px-5 py-2 text-sm font-bold text-white shadow-[0_4px_0_0_#b45309] transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_1px_0_0_#b45309] dark:bg-amber-600 dark:shadow-[0_4px_0_0_#92400e]"
                            >
                                {t.enter}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            {/* Row 3 — ready-made materials */}
            <h2 className="mb-4 text-xl font-extrabold text-gray-900 dark:text-gray-50">{t.materialsHeading}</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {MATERIALS.map((material) => (
                    <div
                        key={material.id}
                        className="flex flex-col overflow-hidden rounded-2xl border-2 border-gray-900/5 bg-white shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl dark:border-gray-100/10 dark:bg-gray-900"
                    >
                        <div className="h-56">
                            <BookCover scene={material.scene} coverColor={material.coverColor} title={material.title} subtitle={material.subtitle} />
                        </div>
                        <div className="flex flex-1 flex-col gap-3 p-4">
                            <div className="flex flex-wrap gap-2">
                                <span className="rounded-full bg-gray-900/5 px-3 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-100/10 dark:text-gray-300">
                                    {t.grade(material.grade)}
                                </span>
                                <span className="rounded-full bg-gray-900/5 px-3 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-100/10 dark:text-gray-300">
                                    {material.lang}
                                </span>
                                <span className="rounded-full bg-gray-900/5 px-3 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-100/10 dark:text-gray-300">
                                    {t.minutes(material.minutes)}
                                </span>
                            </div>
                            <button
                                onClick={() => navigate(`/reading/proficiency/read/${material.id}`)}
                                className="w-full cursor-pointer rounded-full bg-teal-500 px-5 py-2 text-sm font-bold text-white shadow-[0_4px_0_0_#0f766e] transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_1px_0_0_#0f766e] dark:bg-teal-600 dark:shadow-[0_4px_0_0_#115e59]"
                            >
                                {t.enter}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
export default MaterialSelection