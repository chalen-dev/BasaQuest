// File: src/pages/proficiency/review/features/ManualMarkPanel.tsx
//
// "Mark the words yourself" while a reading is still being scored (or could not be), laid
// out like the real review: the passage on the left, a Selected Words stack on the right.
// Tapping a word in the passage adds it to the stack as "said differently"; the card there
// switches it to "skipped" (or takes it off again). Only those two kinds, since that is all
// a person can tell without the scorer's numbers. Marks save by themselves a moment after
// the last change, and are laid onto the scorer's word rows when it finishes.
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import { useLang } from '../../../../contexts/LangContext'
import type { Lang } from '../../../../components/buttons/LangToggle'
import {
    useManualMarksQuery,
    useSaveManualMarksMutation,
    type AttemptWord,
    type ManualMarks,
    type ManualMarkType,
    type Verdict,
} from '../hooks'
import { STRINGS as REVIEW_STRINGS } from './attemptWordReviewStrings'
import { PassageCard } from './PassageCard'
import { SelectedWordsCard } from './SelectedWordsCard'

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
        desc: 'Pindutin ang salita sa talata para markahan ito, pagkatapos piliin sa kanan kung iba ang bigkas o nalaktawan. Awtomatikong nase-save, at idinadagdag sa resulta kapag tapos nang suriin ng sistema.',
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
        desc: 'Tap a word in the passage to mark it, then choose on the right whether it was said differently or skipped. Your marks save on their own and are added to the results when the scorer finishes.',
        fine: 'Fine',
        said: 'Said differently',
        skipped: 'Skipped',
        marked: (n) => (n === 1 ? '1 word marked' : `${n} words marked`),
        saving: 'Saving...',
        saved: 'Saved',
        saveFailed: "Couldn't save. Try again.",
    },
}

// The passage as the scorer reads it: split on whitespace, positions counted from 1.
function passageWordsOf(text: string): string[] {
    return text.split(/\s+/).filter(Boolean)
}

export const ManualMarkPanel: React.FC<{ attemptId: string; passageText: string }> = ({ attemptId, passageText }) => {
    const { lang } = useLang()
    const t = STRINGS[lang]
    const reviewStrings = REVIEW_STRINGS[lang]
    const { data: saved, isSuccess } = useManualMarksQuery(attemptId)
    const save = useSaveManualMarksMutation(attemptId)
    // Which positions are marked, newest first (the order of the Selected Words stack), and how.
    const [order, setOrder] = useState<number[]>([])
    const [types, setTypes] = useState<ManualMarks>({})
    const loaded = useRef(false)
    const dirty = useRef(false)
    const typesRef = useRef<ManualMarks>({})
    const timer = useRef<number | null>(null)

    // The passage as word rows, so the review's own cards can show it.
    const words = useMemo<AttemptWord[]>(
        () =>
            passageWordsOf(passageText).map((word, i) => ({
                id: String(i + 1),
                attempt_id: attemptId,
                word_index: i + 1,
                reference_word: word,
                recognized_word: null,
                error_type: 'None',
                accuracy_score: null,
                system_verdict: 'correct',
                confidence: 'high',
                teacher_verdict: null,
                teacher_reviewed_at: null,
                teacher_reviewed_by: null,
                teacher_manual_flag: false,
                teacher_error_type_override: null,
            })),
        [passageText, attemptId]
    )

    // Start from what was saved before, once.
    useEffect(() => {
        if (isSuccess && !loaded.current) {
            loaded.current = true
            const start = saved ?? {}
            typesRef.current = start
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setTypes(start)
            setOrder(
                Object.keys(start)
                    .map(Number)
                    .sort((a, b) => b - a)
            )
        }
    }, [isSuccess, saved])

    const flush = () => {
        if (timer.current !== null) window.clearTimeout(timer.current)
        timer.current = null
        if (!dirty.current) return
        dirty.current = false
        save.mutate(typesRef.current)
    }
    // Leaving the page right after a change still saves it.
    useEffect(() => {
        return () => {
            if (timer.current !== null) window.clearTimeout(timer.current)
            if (dirty.current) save.mutate(typesRef.current)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const commit = (next: ManualMarks) => {
        typesRef.current = next
        setTypes(next)
        dirty.current = true
        if (timer.current !== null) window.clearTimeout(timer.current)
        timer.current = window.setTimeout(flush, 600)
    }
    // Tap in the passage (or a search result): mark as said differently, or take the mark off.
    const toggleWord = (wordId: string) => {
        if (!loaded.current) return
        const pos = Number(wordId)
        const next = { ...typesRef.current }
        if (next[wordId]) {
            delete next[wordId]
            setOrder((o) => o.filter((p) => p !== pos))
        } else {
            next[wordId] = 'Mispronunciation'
            setOrder((o) => [pos, ...o.filter((p) => p !== pos)])
        }
        commit(next)
    }
    const setType = (wordId: string, type: ManualMarkType) => {
        commit({ ...typesRef.current, [wordId]: type })
    }
    const clearAll = () => {
        setOrder([])
        commit({})
    }

    const verdicts: Record<string, Verdict> = {}
    for (const id of Object.keys(types)) verdicts[id] = 'miscue'
    const count = order.length
    const stackIds = order.map(String)
    return (
        <section className="mt-5">
            <div className="mb-3">
                <h3 className="text-lg font-extrabold text-gray-900 dark:text-gray-50">{t.title}</h3>
                <p className="mt-1 max-w-3xl text-sm font-medium text-gray-700 dark:text-gray-300">{t.desc}</p>
            </div>
            <div className="grid gap-6 lg:h-[calc(100vh-22rem)] lg:min-h-[26rem] lg:grid-cols-[1.3fr_1fr]">
                <div className="lg:min-h-0">
                    <PassageCard
                        words={words}
                        verdicts={verdicts}
                        manualFlags={{}}
                        manualErrorType={types as Record<string, AttemptWord['error_type']>}
                        selectedWordIds={stackIds}
                        t={reviewStrings}
                        onWordClick={toggleWord}
                        markLabels={{ correct: t.fine, said: t.said, skipped: t.skipped }}
                    />
                </div>
                <div className="lg:min-h-0">
                    <SelectedWordsCard
                        words={words}
                        selectedWordIds={stackIds}
                        verdicts={verdicts}
                        manualFlags={{}}
                        manualErrorType={types as Record<string, AttemptWord['error_type']>}
                        t={reviewStrings}
                        onSetErrorType={(wordId, type) => setType(wordId, type)}
                        onClearAll={clearAll}
                        onWordClick={toggleWord}
                        markLabels={{ said: t.said, skipped: t.skipped }}
                    />
                </div>
            </div>
            <div className="mt-3 flex items-center gap-3 text-xs font-bold text-gray-700 dark:text-gray-300">
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
