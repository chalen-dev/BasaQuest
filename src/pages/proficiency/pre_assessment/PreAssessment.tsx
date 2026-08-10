// File: src/pages/proficiency/pre_assessment/PreAssessment.tsx
// Entry point for the oral reading fluency (ORF) check-in: picks the
// assessment language (independent of the site's own UI language toggle).
// Once chosen, navigates to /reading/proficiency/assessment/session, which
// renders under AssessmentSessionLayout — a stripped-down header with no
// nav and no language toggle, so the language can't be changed mid-session
// except by exiting deliberately. See AssessmentSession.tsx for the rest of
// the flow (passage generation, non-reader branch, etc).
import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Languages } from 'lucide-react'
import { Owl } from '../../../components/ui/Owl.tsx'
import { useLang } from '../../../contexts/LangContext.tsx'
import type { Lang } from '../../../components/buttons/LangToggle.tsx'

const STRINGS: Record<Lang, {
    back: string
    languageKicker: string
    languageTitle: string
    languageDesc: string
    filipinoLabel: string
    filipinoDesc: string
    englishLabel: string
    englishDesc: string
}> = {
    fil: {
        back: 'Bumalik',
        languageKicker: 'Unang Hakbang',
        languageTitle: 'Aling Wika ang Gagamitin?',
        languageDesc: 'Piliin ang wikang gagamitin sa pagbasa — ito ang wika ng talatang bubuuin.',
        filipinoLabel: 'Filipino',
        filipinoDesc: 'Bubuo ng talata sa Filipino/Tagalog.',
        englishLabel: 'English',
        englishDesc: 'Will generate the passage in English.',
    },
    en: {
        back: 'Back',
        languageKicker: 'First Step',
        languageTitle: 'Which Language?',
        languageDesc: "Pick the language for this check-in — it's the language the passage will be written in.",
        filipinoLabel: 'Filipino',
        filipinoDesc: 'Bubuo ng talata sa Filipino/Tagalog.',
        englishLabel: 'English',
        englishDesc: 'Will generate the passage in English.',
    },
}

export const PreAssessment: React.FC = () => {
    const navigate = useNavigate()
    const { lang } = useLang()
    const t = STRINGS[lang]

    const chooseLanguage = (chosen: Lang) => {
        navigate(`/reading/proficiency/assessment/session?lang=${chosen}`)
    }

    return (
        <div className="mx-auto max-w-3xl px-4 pb-12 pt-2">
            <div className="mb-4 flex flex-wrap items-center gap-3">
                <Link
                    to="/reading/proficiency"
                    className="flex items-center gap-1.5 rounded-full border border-gray-900/10 bg-white px-4 py-1.5 text-sm font-bold text-gray-700 shadow-sm transition-colors duration-200 hover:bg-gray-900/5 dark:border-gray-100/10 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-100/10"
                >
                    <ArrowLeft size={16} />
                    {t.back}
                </Link>
            </div>

            <section className="relative overflow-hidden rounded-3xl border border-gray-900/5 p-6 shadow-sm transition-colors duration-300 dark:border-gray-100/10 sm:p-8">
                <div className="absolute inset-0 dark:hidden" style={{ background: 'linear-gradient(180deg, #fffdf8 0%, #fff3dd 100%)' }} />
                <div className="absolute inset-0 hidden dark:block" style={{ background: 'linear-gradient(180deg, #0f172a 0%, #020617 100%)' }} />
                <div className="relative flex flex-col items-center gap-5 text-center sm:items-start sm:text-left">
                    <Owl mood="greeting" size={80} bob />
                    <div>
                        <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-teal-700 dark:text-teal-300">
                            <Languages size={14} />
                            {t.languageKicker}
                        </span>
                        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-50 sm:text-3xl">
                            {t.languageTitle}
                        </h1>
                        <p className="mt-2 max-w-xl text-base font-medium text-gray-600 dark:text-gray-400">
                            {t.languageDesc}
                        </p>
                    </div>
                    <div className="grid w-full gap-4 sm:grid-cols-2">
                        <button
                            onClick={() => chooseLanguage('fil')}
                            className="cursor-pointer rounded-2xl border-2 border-teal-500/25 bg-white p-5 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-teal-500/50 hover:shadow-md dark:border-teal-400/25 dark:bg-gray-900 dark:hover:border-teal-400/50"
                        >
                            <span className="text-lg font-extrabold text-gray-900 dark:text-gray-50">{t.filipinoLabel}</span>
                            <p className="mt-1 text-sm font-medium text-gray-600 dark:text-gray-400">{t.filipinoDesc}</p>
                        </button>
                        <button
                            onClick={() => chooseLanguage('en')}
                            className="cursor-pointer rounded-2xl border-2 border-teal-500/25 bg-white p-5 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-teal-500/50 hover:shadow-md dark:border-teal-400/25 dark:bg-gray-900 dark:hover:border-teal-400/50"
                        >
                            <span className="text-lg font-extrabold text-gray-900 dark:text-gray-50">{t.englishLabel}</span>
                            <p className="mt-1 text-sm font-medium text-gray-600 dark:text-gray-400">{t.englishDesc}</p>
                        </button>
                    </div>
                </div>
            </section>
        </div>
    )
}

export default PreAssessment