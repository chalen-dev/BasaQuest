// File: src/pages/admin/recording/session/components/WordTaggingPanel.tsx
// The word-level tagging UI from RecordSession.tsx's recorder panel —
// tap-to-cycle word chips (correct -> mispronounced -> omitted) plus the
// free-text insertions list, see RecordSession.tsx's header comment for
// how this feeds the evaluation/fine_tuning status split. Purely
// presentational: all state and mutation live in the parent.
import { Tag } from 'lucide-react'
type WordTaggingPanelProps = {
    words: string[]
    wordFlags: Record<number, 'mispronunciation' | 'omission'>
    onCycleWord: (index: number) => void
    insertions: string[]
    onRemoveInsertion: (index: number) => void
    insertionDraft: string
    onInsertionDraftChange: (value: string) => void
    onAddInsertion: () => void
}
export function WordTaggingPanel({
                                     words,
                                     wordFlags,
                                     onCycleWord,
                                     insertions,
                                     onRemoveInsertion,
                                     insertionDraft,
                                     onInsertionDraftChange,
                                     onAddInsertion,
                                 }: WordTaggingPanelProps) {
    return (
        <div className="w-full">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                <Tag size={12} /> Tag mistakes (optional) — tap a word: correct → mispronounced → omitted
            </p>
            <div className="flex flex-wrap gap-1.5">
                {words.map((word, i) => {
                    const flag = wordFlags[i]
                    return (
                        <button
                            key={i}
                            type="button"
                            onClick={() => onCycleWord(i)}
                            aria-label={`Word "${word}": ${flag ?? 'correct'}`}
                            className={`cursor-pointer rounded-full border-2 px-3 py-1 text-sm font-bold transition-colors duration-150 ${
                                flag === 'mispronunciation'
                                    ? 'border-orange-500 bg-orange-500/15 text-orange-700 dark:border-orange-400 dark:bg-orange-400/15 dark:text-orange-300'
                                    : flag === 'omission'
                                        ? 'border-rose-500 bg-rose-500/15 text-rose-700 line-through dark:border-rose-400 dark:bg-rose-400/15 dark:text-rose-300'
                                        : 'border-gray-900/10 text-gray-600 hover:bg-gray-900/5 dark:border-gray-100/10 dark:text-gray-300 dark:hover:bg-gray-100/10'
                            }`}
                        >
                            {word}
                        </button>
                    )
                })}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {insertions.map((word, i) => (
                    <button
                        key={i}
                        type="button"
                        onClick={() => onRemoveInsertion(i)}
                        title="Remove"
                        className="flex items-center gap-1 rounded-full border-2 border-violet-500 bg-violet-500/15 px-3 py-1 text-sm font-bold text-violet-700 dark:border-violet-400 dark:bg-violet-400/15 dark:text-violet-300"
                    >
                        + {word} ×
                    </button>
                ))}
                <input
                    type="text"
                    value={insertionDraft}
                    onChange={(e) => onInsertionDraftChange(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault()
                            onAddInsertion()
                        }
                    }}
                    placeholder="Extra word said…"
                    className="w-36 rounded-full border-2 border-gray-900/10 bg-transparent px-3 py-1 text-sm font-semibold text-gray-700 outline-none focus:border-violet-400 dark:border-gray-100/10 dark:text-gray-200"
                />
                <button
                    type="button"
                    onClick={onAddInsertion}
                    disabled={!insertionDraft.trim()}
                    className="cursor-pointer rounded-full border-2 border-gray-900/10 px-3 py-1 text-sm font-bold text-gray-600 hover:bg-gray-900/5 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-100/10 dark:text-gray-300 dark:hover:bg-gray-100/10"
                >
                    Add
                </button>
            </div>
        </div>
    )
}
export default WordTaggingPanel