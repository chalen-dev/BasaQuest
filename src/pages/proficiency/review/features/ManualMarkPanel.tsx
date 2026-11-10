// File: src/pages/proficiency/review/features/ManualMarkPanel.tsx
//
// "Mark the words yourself" while a reading is still being scored (or could not be): the
// passage, one tappable chip per word. Tapping a word cycles it: fine, then said
// differently, then skipped, then fine again. The marks save by themselves a moment after
// the last tap, and are laid onto the scorer's word rows once it finishes.
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { useLang } from '../../../../contexts/LangContext'
import type { Lang } from '../../../../components/buttons/LangToggle'
import { useManualMarksQuery, useSaveManualMarksMutation, type ManualMarks, type ManualMarkType } from '../hooks'

const STRINGS: Record<Lang, {
    title: string
    desc: string
    fine: string
    said: string
    skipped: string
    marked: (n: number) => string
    saving: string
    saved: string
    saveFailed: string
}> = {
    fil: {
        title: 'Markahan ang mga salita habang hinihintay',
        desc: 'Pindutin ang salita para markahan ito: binigkas nang iba, pagkatapos nalaktawan, pagkatapos tama ulit. Awtomatikong nase-save, at idinadagdag sa resulta kapag tapos nang suriin ng sistema.',
        fine: 'Tama',
        said: 'Iba ang bigkas',
        skipped: 'Nalaktawan',
        marked: (n) => (n === 1 ? '1 salitang minarkahan' : `${n} salitang minarkahan`),
        saving: 'Sine-save...',
        saved: 'Na-save',
        saveFailed: 'Hindi na-save. Subukan muli.',
    },
    en: {
        title: 'Mark the words while you wait',
        desc: 'Tap a word to mark it: said differently, then skipped, then fine again. Your marks save on their own and are added to the results when the scorer finishes.',
        fine: 'Fine',
        said: 'Said differently',
        skipped: 'Skipped',
        marked: (n) => (n === 1 ? '1 word marked' : `${n} words marked`),
        saving: 'Saving...',
        saved: 'Saved',
        saveFailed: "Couldn't save. Try again.",
    },
}

const NEXT: Record<string, ManualMarkType | undefined> = {
    none: 'Mispronunciation',
    Mispronunciation: 'Omission',
    Omission: undefined,
}

// The passage as the scorer reads it: split on whitespace, positions counted from 1.
function passageWordsOf(text: string): string[] {
    return text.split(/\s+/).filter(Boolean)
}

export const ManualMarkPanel: React.FC<{ attemptId: string; passageText: string }> = ({ attemptId, passageText }) => {
    const { lang } = useLang()
    const t = STRINGS[lang]
    const words = useMemo(() => passageWordsOf(passageText), [passageText])
    const { data: saved, isSuccess } = useManualMarksQuery(attemptId)
    const save = useSaveManualMarksMutation(attemptId)
    const [marks, setMarks] = useState<ManualMarks>({})
    const loaded = useRef(false)
    const dirty = useRef(false)
    const marksRef = useRef<ManualMarks>({})
    const timer = useRef<number | null>(null)

    // Start from what was saved before, once.
    useEffect(() => {
        if (isSuccess && !loaded.current) {
            loaded.current = true
            marksRef.current = saved ?? {}
            setMarks(saved ?? {})
        }
    }, [isSuccess, saved])

    const flush = () => {
        if (timer.current !== null) window.clearTimeout(timer.current)
        timer.current = null
        if (!dirty.current) return
        dirty.current = false
        save.mutate(marksRef.current)
    }
    // Leaving the page right after a tap still saves it.
    useEffect(() => {
        return () => {
            if (timer.current !== null) window.clearTimeout(timer.current)
            if (dirty.current) save.mutate(marksRef.current)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const tap = (position: number) => {
        if (!loaded.current) return
        const key = String(position)
        const next = { ...marksRef.current }
        const step = NEXT[next[key] ?? 'none']
        if (step) next[key] = step
        else delete next[key]
        marksRef.current = next
        setMarks(next)
        dirty.current = true
        if (timer.current !== null) window.clearTimeout(timer.current)
        timer.current = window.setTimeout(flush, 600)
    }

    const count = Object.keys(marks).length
    return (
        <section className="mt-5 rounded-3xl border-2 border-gray-900/5 bg-white p-6 shadow-md dark:border-gray-100/10 dark:bg-gray-900 sm:p-7">
            <h3 className="text-lg font-extrabold text-gray-900 dark:text-gray-50">{t.title}</h3>
            <p className="mt-1 max-w-2xl text-sm font-medium text-gray-600 dark:text-gray-400">{t.desc}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300">
                <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block h-3 w-3 rounded-full bg-gray-300 dark:bg-gray-600" />
                    {t.fine}
                </span>
                <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block h-3 w-3 rounded-full bg-rose-500" />
                    {t.said}
                </span>
                <span className="inline-flex items-center gap-1.5">
                    <span className="inline-block h-3 w-3 rounded-full border-2 border-dashed border-rose-500" />
                    {t.skipped}
                </span>
            </div>
            <div className="mt-4 flex flex-wrap gap-x-1.5 gap-y-2 text-base leading-snug">
                {words.map((word, i) => {
                    const mark = marks[String(i + 1)]
                    const style =
                        mark === 'Mispronunciation'
                            ? 'bg-rose-500 text-white'
                            : mark === 'Omission'
                              ? 'border-2 border-dashed border-rose-500 bg-rose-500/10 text-rose-700 line-through dark:text-rose-300'
                              : 'bg-gray-900/5 text-gray-800 hover:bg-teal-500/20 dark:bg-gray-100/10 dark:text-gray-100 dark:hover:bg-teal-400/25'
                    return (
                        <button
                            key={i}
                            type="button"
                            onClick={() => tap(i + 1)}
                            aria-pressed={!!mark}
                            title={mark === 'Omission' ? t.skipped : mark === 'Mispronunciation' ? t.said : t.fine}
                            className={`cursor-pointer rounded-lg px-2 py-0.5 font-semibold transition-colors active:scale-95 ${style}`}
                        >
                            {word}
                        </button>
                    )
                })}
            </div>
            <div className="mt-4 flex items-center gap-3 text-xs font-bold text-gray-500 dark:text-gray-400">
                <span>{t.marked(count)}</span>
                {save.isPending ? (
                    <span className="inline-flex items-center gap-1">
                        <Loader2 size={14} className="animate-spin" />
                        {t.saving}
                    </span>
                ) : save.isError ? (
                    <span className="text-rose-600 dark:text-rose-400">{t.saveFailed}</span>
                ) : save.isSuccess ? (
                    <span className="inline-flex items-center gap-1 text-teal-700 dark:text-teal-300">
                        <Check size={14} />
                        {t.saved}
                    </span>
                ) : null}
            </div>
        </section>
    )
}

export default ManualMarkPanel
