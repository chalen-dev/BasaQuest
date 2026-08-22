// File: src/pages/admin/recording/session/components/QualityFlagChips.tsx
// The "Flag this take?" chip row from RecordSession.tsx's recorder
// panel — whole-clip quality flags, see RecordSession.tsx's header
// comment for the two-tier flagging model. Purely presentational: the
// active/inactive state and the reason list both come from outside.
import { Flag } from 'lucide-react'
import { FLAG_REASONS } from '../flagReasons'
type QualityFlagChipsProps = {
    flagReasons: string[]
    onToggle: (key: string) => void
}
export function QualityFlagChips({ flagReasons, onToggle }: QualityFlagChipsProps) {
    return (
        <div className="w-full">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                <Flag size={12} /> Flag this take? (optional)
            </p>
            <div className="flex flex-wrap gap-1.5">
                {FLAG_REASONS.map((reason) => {
                    const active = flagReasons.includes(reason.key)
                    return (
                        <button
                            key={reason.key}
                            type="button"
                            onClick={() => onToggle(reason.key)}
                            aria-pressed={active}
                            className={`cursor-pointer rounded-full border-2 px-3 py-1 text-xs font-bold transition-colors duration-150 ${
                                active
                                    ? 'border-amber-500 bg-amber-500/15 text-amber-700 dark:border-amber-400 dark:bg-amber-400/15 dark:text-amber-300'
                                    : 'border-gray-900/10 text-gray-600 hover:bg-gray-900/5 dark:border-gray-100/10 dark:text-gray-300 dark:hover:bg-gray-100/10'
                            }`}
                        >
                            {reason.label}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
export default QualityFlagChips