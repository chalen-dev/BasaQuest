// File: src/pages/story_builder/StoryBuilderPage.tsx
//
// Story Builder: where a teacher will write their own stories for the fluent reading and
// comprehension tracks. For now this is the landing page the Home card opens; the builder
// itself comes next.
import React from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Owl } from '../../components/ui/Owl.tsx'
import { useLang } from '../../contexts/LangContext'
import { useProfile } from '../../hooks/useProfile.ts'
import type { Lang } from '../../components/buttons/LangToggle'

const STRINGS: Record<Lang, { back: string; title: string; desc: string }> = {
    fil: {
        back: 'Bumalik sa Tahanan',
        title: 'Story Builder',
        desc: 'Dito mo bubuuin ang sarili mong mga kuwento para sa pagbasa nang malakas at pag-unawa sa binasa. Malapit na.',
    },
    en: {
        back: 'Back to Home',
        title: 'Story Builder',
        desc: 'This is where you will build your own stories for the fluent reading and comprehension tracks. Coming soon.',
    },
}

export const StoryBuilderPage: React.FC = () => {
    const navigate = useNavigate()
    const { lang } = useLang()
    const { profile } = useProfile()
    const t = STRINGS[lang]
    // Teachers only.
    if (profile && profile.role !== 'teacher') return <Navigate to="/home" replace />
    return (
        <div className="mx-auto max-w-3xl px-4 pb-12 pt-2">
            <button
                onClick={() => navigate('/home')}
                className="mb-4 flex cursor-pointer items-center gap-1.5 rounded-full border border-gray-900/10 bg-white px-4 py-1.5 text-sm font-bold text-gray-700 shadow-sm transition-colors duration-200 hover:bg-gray-900/5 dark:border-gray-100/10 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-100/10"
            >
                <ArrowLeft size={16} />
                {t.back}
            </button>
            <section className="flex flex-col items-center gap-3 rounded-3xl border-2 border-gray-900/5 bg-white p-8 text-center shadow-md dark:border-gray-100/10 dark:bg-gray-900">
                <Owl mood="proud" size={72} />
                <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-50">{t.title}</h1>
                <p className="max-w-md text-sm font-medium text-gray-600 dark:text-gray-400">{t.desc}</p>
            </section>
        </div>
    )
}

export default StoryBuilderPage
