// File: src/pages/admin/genderDisplay.tsx
// Shared gender icon/color/label convention for the finetune roster —
// used anywhere a student's gender needs to render as more than plain
// text: roster rows, the recording picker, and the form's live preview.
// Male = blue + Mars, female = pink + Venus, anything else (null, empty,
// or an unrecognized value) falls back to a neutral gray "unspecified"
// treatment rather than guessing.
import type { ReactNode } from 'react'
import { Mars, Venus, CircleHelp } from 'lucide-react'
// eslint-disable-next-line react-refresh/only-export-components
export function genderIcon(gender: string | null | undefined, size = 14): ReactNode {
    const g = (gender ?? '').toLowerCase()
    if (g === 'male') return <Mars size={size} />
    if (g === 'female') return <Venus size={size} />
    return <CircleHelp size={size} />
}
// eslint-disable-next-line react-refresh/only-export-components
export function genderColorClasses(gender: string | null | undefined): string {
    const g = (gender ?? '').toLowerCase()
    if (g === 'male') return 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
    if (g === 'female') return 'bg-pink-500/15 text-pink-600 dark:text-pink-400'
    return 'bg-gray-500/10 text-gray-500 dark:bg-gray-100/10 dark:text-gray-400'
}
// eslint-disable-next-line react-refresh/only-export-components
export function genderLabel(gender: string | null | undefined): string {
    const g = (gender ?? '').toLowerCase()
    if (g === 'male') return 'Male'
    if (g === 'female') return 'Female'
    return 'Not specified'
}
type GenderBadgeProps = {
    gender: string | null | undefined
    className?: string
}
export function GenderBadge({ gender, className = '' }: GenderBadgeProps) {
    return (
        <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${genderColorClasses(gender)} ${className}`}
        >
            {genderIcon(gender, 12)}
            {genderLabel(gender)}
        </span>
    )
}