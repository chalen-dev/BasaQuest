import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Mic, BookOpen, BarChart3, ArrowRight } from 'lucide-react'
import { Owl } from '../../components/ui/Owl.tsx'
import { useLang } from '../../contexts/LangContext'
import type { Lang } from '../../components/buttons/LangToggle'
import { TrackScene } from './components/TrackScene'
const TRACK_META = [
    { id: 'proficiency', to: '/reading/proficiency', icon: Mic, color: 'orange' },
    { id: 'comprehension', to: '/reading/comprehension', icon: BookOpen, color: 'sky' },
    { id: 'history', to: '/history', icon: Shield, color: 'teal' },
] as const
const STRINGS: Record<Lang, {
    schoolTag: string
    heroTitle: string
    heroTagline: string
    pickTrack: string
    enter: string
    tracks: Record<'history' | 'proficiency' | 'comprehension', { kicker: string; title: string; desc: string; tag: string; badge: string }>
    teacherSection: { kicker: string; title: string; desc: string; cta: string }
}> = {
    fil: {
        schoolTag: 'Sto. Niño Elementary School · Carmen, Davao del Norte',
        heroTitle: 'Maligayang pagdating sa',
        heroTagline: 'Tatlong magkakahiwalay na paglalakbay. Piliin kung saan ka magsisimula — kasaysayan, malakas na pagbasa, o pag-unawa.',
        pickTrack: 'Piliin ang iyong track',
        enter: 'Pumasok',
        tracks: {
            history: {
                kicker: 'Track 3 · Kasaysayan',
                title: 'Mga Bayani ng Kasaysayan',
                desc: 'Maglaro bilang kaagapay ng mga bayani — Lapu-Lapu, Bonifacio, at Datu Bago ng Davao. May kwento, timadong desisyon, at mini-game.',
                tag: 'Baitang 5 · Araling Panlipunan',
                badge: 'Preview',
            },
            proficiency: {
                kicker: 'Track 1 · Pagbasa nang Malakas',
                title: 'Basa nang Malakas',
                desc: 'Magbasa ng talata nang malakas at i-record ang iyong boses. Makikita ang iyong katumpakan at bilis — susuriin ng guro.',
                tag: 'Baitang 1–6 · MediaRecorder',
                badge: 'Buong track',
            },
            comprehension: {
                kicker: 'Track 2 · Pag-unawa sa Binasa',
                title: 'Pag-unawa sa Kwento',
                desc: 'Basahin ang kwento, pagkatapos sagutin ang mga tanong — may pagpipilian at sariling sagot. Makikita ang iyong iskor at insights.',
                tag: 'Baitang 1–6 · MCQ + sanaysay',
                badge: 'Preview',
            },
        },
        teacherSection: {
            kicker: 'Para sa mga guro',
            title: 'Analytics Dashboard',
            desc: 'Tingnan ang progreso ng klase, mga iskor, at insight sa bawat mag-aaral — hindi ito isang learning track.',
            cta: 'Buksan ang dashboard',
        },
    },
    en: {
        schoolTag: 'Sto. Niño Elementary School · Carmen, Davao del Norte',
        heroTitle: 'Welcome to',
        heroTagline: 'Three separate journeys. Pick where you want to start — history, fluent reading, or comprehension.',
        pickTrack: 'Choose your track',
        enter: 'Enter',
        tracks: {
            history: {
                kicker: 'Track 3 · History',
                title: 'Heroes of History',
                desc: 'Play alongside historical heroes — Lapu-Lapu, Bonifacio, and Datu Bago of Davao. Includes a story, timed decisions, and a mini-game.',
                tag: 'Grade 5 · Social Studies',
                badge: 'Preview',
            },
            proficiency: {
                kicker: 'Track 1 · Fluent Reading',
                title: 'Read Out Loud',
                desc: 'Read a passage out loud and record your voice. See your accuracy and pace — reviewed by your teacher.',
                tag: 'Grade 1–6 · MediaRecorder',
                badge: 'Full track',
            },
            comprehension: {
                kicker: 'Track 2 · Reading Comprehension',
                title: 'Understanding the Story',
                desc: 'Read the story, then answer questions — multiple choice and short answer. See your score and insights.',
                tag: 'Grade 1–6 · MCQ + essay',
                badge: 'Preview',
            },
        },
        teacherSection: {
            kicker: 'For teachers',
            title: 'Student Analytics Dashboard',
            desc: "See class progress, scores, and insights across your students — this isn't a learning track.",
            cta: 'Open dashboard',
        },
    },
}
const COLOR_CLASSES: Record<string, { badge: string; icon: string; button: string }> = {
    teal: {
        badge: 'bg-teal-500/90 text-white',
        icon: 'text-teal-600',
        button: 'bg-teal-500 shadow-[0_4px_0_0_#0f766e] active:shadow-[0_1px_0_0_#0f766e] dark:bg-teal-600 dark:shadow-[0_4px_0_0_#115e59]',
    },
    orange: {
        badge: 'bg-white/90 text-gray-700',
        icon: 'text-orange-600',
        button: 'bg-orange-500 shadow-[0_4px_0_0_#c2410c] active:shadow-[0_1px_0_0_#c2410c] dark:bg-orange-600 dark:shadow-[0_4px_0_0_#9a3412]',
    },
    sky: {
        badge: 'bg-white/90 text-gray-700',
        icon: 'text-sky-600',
        button: 'bg-sky-500 shadow-[0_4px_0_0_#0369a1] active:shadow-[0_1px_0_0_#0369a1] dark:bg-sky-600 dark:shadow-[0_4px_0_0_#075985]',
    },
}
export const Home: React.FC = () => {
    const navigate = useNavigate()
    const { lang } = useLang()
    const t = STRINGS[lang]
    return (
        <div className="mx-auto max-w-6xl px-4 pb-12 pt-2">
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
                    <Owl mood="greeting" size={100} bob />
                    <div>
                        <span className="mb-2 inline-block rounded-full bg-teal-500/15 px-3 py-1 text-xs font-bold text-teal-700 dark:bg-teal-400/15 dark:text-teal-300">
                            {t.schoolTag}
                        </span>
                        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-50 sm:text-4xl">
                            {t.heroTitle} <span className="text-orange-500">BasaQuest</span>!
                        </h1>
                        <p className="mt-2 max-w-xl text-base font-medium text-gray-600 dark:text-gray-400">
                            {t.heroTagline}
                        </p>
                    </div>
                </div>
            </section>
            <h2 className="mb-4 text-xl font-extrabold text-gray-900 dark:text-gray-50">{t.pickTrack}</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {TRACK_META.map((meta) => {
                    const Icon = meta.icon
                    const colors = COLOR_CLASSES[meta.color]
                    const copy = t.tracks[meta.id]
                    return (
                        <button
                            key={meta.id}
                            onClick={() => navigate(meta.to)}
                            className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border-2 border-gray-900/5 bg-white text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-gray-900/10 hover:shadow-xl active:translate-y-0 active:shadow-sm dark:border-gray-100/10 dark:bg-gray-900 dark:hover:border-gray-100/20"
                        >
                            <div className="relative h-32 overflow-hidden">
                                <TrackScene name={meta.id} className="absolute inset-0 h-full w-full" />
                                <span className="absolute left-3 top-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/90 shadow-sm transition-transform duration-200 group-hover:scale-110">
                                    <Icon size={22} className={colors.icon} />
                                </span>
                                <span className={`absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-bold ${colors.badge}`}>
                                    {copy.badge}
                                </span>
                            </div>
                            <div className="flex flex-1 flex-col gap-2 p-5">
                                <span className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                                    {copy.kicker}
                                </span>
                                <h3 className="text-xl font-extrabold text-gray-900 dark:text-gray-50">{copy.title}</h3>
                                <p className="flex-1 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{copy.desc}</p>
                                <span className="mb-2 inline-block w-fit rounded-full bg-gray-900/5 px-3 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-100/10 dark:text-gray-300">
                                    {copy.tag}
                                </span>
                                <span className={`w-fit rounded-full px-5 py-2 text-sm font-bold text-white transition-[transform,box-shadow] duration-150 group-hover:translate-x-1 ${colors.button}`}>
                                    {t.enter} →
                                </span>
                            </div>
                        </button>
                    )
                })}
            </div>
            <button
                onClick={() => navigate('/dashboard')}
                className="group mt-8 flex w-full cursor-pointer flex-col items-start gap-4 rounded-2xl border-2 border-dashed border-gray-900/15 bg-gray-900/[0.03] p-6 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-gray-900/25 hover:bg-gray-900/5 dark:border-gray-100/15 dark:bg-gray-100/[0.03] dark:hover:border-gray-100/25 dark:hover:bg-gray-100/5 sm:flex-row sm:items-center sm:justify-between"
            >
                <div className="flex items-center gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gray-900/10 text-gray-700 dark:bg-gray-100/10 dark:text-gray-200">
                        <BarChart3 size={22} />
                    </span>
                    <div>
                        <span className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                            {t.teacherSection.kicker}
                        </span>
                        <h3 className="text-lg font-extrabold text-gray-900 dark:text-gray-50">{t.teacherSection.title}</h3>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t.teacherSection.desc}</p>
                    </div>
                </div>
                <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-gray-900/15 px-4 py-2 text-sm font-bold text-gray-700 transition-transform duration-150 group-hover:translate-x-1 dark:border-gray-100/15 dark:text-gray-200">
                    {t.teacherSection.cta}
                    <ArrowRight size={16} />
                </span>
            </button>
        </div>
    )
}
export default Home