// File: src/components/ui/SourceBadge.tsx
// Small pill saying which kind of activity a review, result or remediation
// material came from. Only fluent reading exists today; comprehension is listed
// so its items can be labelled the same way when they arrive.
import { BookOpen, Lightbulb } from 'lucide-react'
import { useLang } from '../../contexts/LangContext'
import type { Lang } from '../buttons/LangToggle'

export type ActivitySource = 'fluent_reading' | 'comprehension'

const LABEL: Record<Lang, Record<ActivitySource, string>> = {
    fil: { fluent_reading: 'Fluent Reading', comprehension: 'Pag-unawa' },
    en: { fluent_reading: 'Fluent Reading', comprehension: 'Comprehension' },
}

const TONE: Record<ActivitySource, string> = {
    fluent_reading: 'bg-teal-500/15 text-teal-700 dark:bg-teal-400/15 dark:text-teal-300',
    comprehension: 'bg-sky-500/15 text-sky-700 dark:bg-sky-400/15 dark:text-sky-300',
}

// `size` follows the pills around it: 'md' for the list rows, 'sm' for the
// smaller cards on a pupil's remediation page.
export function SourceBadge({ source = 'fluent_reading', size = 'md' }: { source?: ActivitySource; size?: 'sm' | 'md' }) {
    const { lang } = useLang()
    const Icon = source === 'fluent_reading' ? BookOpen : Lightbulb
    const sizing = size === 'md' ? 'gap-1.5 px-3.5 py-1.5 text-base' : 'gap-1 px-2.5 py-0.5 text-xs'
    return (
        <span className={`inline-flex items-center rounded-full font-bold ${sizing} ${TONE[source]}`}>
            <Icon size={size === 'md' ? 16 : 12} />
            {LABEL[lang][source]}
        </span>
    )
}
