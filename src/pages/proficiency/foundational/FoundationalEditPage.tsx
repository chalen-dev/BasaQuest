// File: src/pages/proficiency/foundational/FoundationalEditPage.tsx
//
// "Edit cards" for a Foundational level (/reading/proficiency/foundational/:levelId/edit),
// opened from the button in the Letters & Sounds scene. Each letter has a list of cards
// (objects): the first is the letter's main word, the rest appear when a pupil taps the
// picture. An admin edits the shared default set; a teacher makes a copy of it and edits
// their own, which their pupils then see (see hooks.ts for how a set is chosen).
// A card's picture is the scene's drawing for the word, else the Word Pictures library
// image, else the emoji typed here (shown below as a preview).
import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowDown, ArrowLeft, ArrowUp, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { useProfile } from '../../../hooks/useProfile.ts'
import { normalizeImageWord, useWordImageQuery } from '../../../hooks/useWordImage.ts'
import { useTheme } from '../../../contexts/ThemeContext.tsx'
import { showConfirmation } from '../../../helpers/swalHelpers.ts'
import { findFoundationalLevel } from './data/levels.ts'
import type { FoundationalLanguage, FoundationalLetter } from './data/types.ts'
import {
    PICTURE_ALIASES,
    PREFER_DRAWING,
    sortLetters,
    useFoundationalEditorQuery,
    useMakeMyCopyMutation,
    useResetToDefaultMutation,
    useSaveLetterMutation,
    type DraftCard,
    type FoundationalCardRow,
} from './hooks.ts'

const button =
    'cursor-pointer rounded-full px-4 py-2 text-sm font-bold transition-[transform,box-shadow] duration-150 disabled:cursor-not-allowed disabled:opacity-40'
const primary = `${button} bg-amber-500 text-white shadow-[0_3px_0_0_#b45309] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_1px_0_0_#b45309] dark:bg-amber-600 dark:shadow-[0_3px_0_0_#92400e]`
const secondary = `${button} border border-gray-900/10 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-100/10 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800`
const input =
    'w-full rounded-lg border border-gray-900/15 bg-white px-2 py-1.5 text-sm font-semibold text-gray-900 dark:border-gray-100/15 dark:bg-gray-950 dark:text-gray-50'

const FoundationalEditPage: React.FC = () => {
    const navigate = useNavigate()
    const { levelId } = useParams()
    const { theme } = useTheme()
    const { profile, loading } = useProfile()
    const level = findFoundationalLevel(levelId)
    const editor = useFoundationalEditorQuery(level?.id ?? '')
    const makeCopy = useMakeMyCopyMutation(level?.id ?? '')
    const reset = useResetToDefaultMutation()

    const back = () => navigate(level ? `/reading/proficiency/foundational/${level.id}` : '/reading/proficiency')
    const shell = (children: React.ReactNode) => (
        <div className="mx-auto max-w-6xl px-4 pb-12 pt-6">
            <button
                onClick={back}
                className="mb-4 flex cursor-pointer items-center gap-1.5 text-sm font-bold text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
            >
                <ArrowLeft size={16} /> Back to the cards
            </button>
            {children}
        </div>
    )

    if (loading) return shell(<p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Loading…</p>)
    if (!level?.letters) return shell(<p className="font-semibold text-gray-700 dark:text-gray-300">This level has no editable cards.</p>)
    if (profile?.role !== 'teacher' && profile?.role !== 'admin') {
        return shell(<p className="font-semibold text-gray-700 dark:text-gray-300">Only teachers and admins can edit the cards.</p>)
    }

    const isAdmin = profile.role === 'admin'
    const state = editor.data
    const letters = sortLetters(level.letters)

    const onMakeCopy = () => {
        if (state?.defaultSet) makeCopy.mutate(state.defaultSet.id)
    }
    const onReset = async () => {
        if (!state?.mySet) return
        const ok = await showConfirmation(
            'Go back to the shared cards?',
            'Your own version of these cards will be deleted, and your pupils will see the shared set again.',
            theme === 'dark',
            'warning',
            'Yes, reset',
        )
        if (ok) reset.mutate(state.mySet.id)
    }

    return shell(
        <>
            <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-50">Edit cards · {level.title}</h1>
            <p className="mt-1 max-w-3xl text-sm font-medium text-gray-600 dark:text-gray-400">
                Each letter has a main word and any extra objects. Pupils tap the picture to see the next object. The picture is the
                scene&rsquo;s drawing for the word if there is one, then a picture from the Word Pictures library, then the emoji you type.
            </p>

            {editor.isLoading && <p className="mt-6 text-sm font-semibold text-gray-600 dark:text-gray-400">Loading the cards…</p>}
            {editor.error && (
                <p className="mt-6 rounded-xl border border-red-500/30 bg-red-50 p-4 text-sm font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">
                    Could not load the cards. If this is a new setup, the cards table may not have been created yet.
                </p>
            )}

            {state && !state.defaultSet && !editor.error && (
                <p className="mt-6 rounded-xl border border-amber-500/30 bg-amber-50 p-4 text-sm font-semibold text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
                    The shared set has not been created yet, so there is nothing to edit. Pupils see the built-in cards.
                </p>
            )}

            {state?.defaultSet && (
                <div className="mt-6 flex flex-col gap-3 rounded-2xl border-2 border-amber-500/25 bg-white p-4 dark:border-amber-400/25 dark:bg-gray-900 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {isAdmin
                            ? 'You are editing the shared set. Everyone who has not made their own version sees it.'
                            : state.mySet
                              ? 'You are editing your own version. Your pupils see it.'
                              : 'You are looking at the shared set. Make your own copy to change the cards for your pupils.'}
                    </p>
                    <div className="flex shrink-0 gap-2">
                        {!isAdmin && !state.mySet && (
                            <button className={primary} onClick={onMakeCopy} disabled={makeCopy.isPending}>
                                {makeCopy.isPending ? 'Copying…' : 'Make my own copy'}
                            </button>
                        )}
                        {!isAdmin && state.mySet && (
                            <button className={secondary} onClick={onReset} disabled={reset.isPending}>
                                <span className="inline-flex items-center gap-1.5">
                                    <RotateCcw size={14} /> Reset to shared
                                </span>
                            </button>
                        )}
                    </div>
                </div>
            )}

            {state?.target && (
                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {letters.map((letter) => {
                        const rows = state.cards.filter((c) => c.letter === letter.lower).sort((a, b) => a.position - b.position)
                        // A fresh editor whenever the saved cards change, so its draft starts from them.
                        const signature = rows.map((r) => `${r.id}`).join(',')
                        return (
                            <LetterEditor
                                key={`${letter.lower}:${signature}`}
                                setId={state.target!.id}
                                letter={letter}
                                saved={rows}
                            />
                        )
                    })}
                </div>
            )}
        </>,
    )
}

function LetterEditor({ setId, letter, saved }: { setId: string; letter: FoundationalLetter; saved: FoundationalCardRow[] }) {
    const save = useSaveLetterMutation()
    const [draft, setDraft] = useState<DraftCard[]>(saved.map((c) => ({ word: c.word, emoji: c.emoji })))
    const [message, setMessage] = useState('')

    const dirty = JSON.stringify(draft) !== JSON.stringify(saved.map((c) => ({ word: c.word, emoji: c.emoji })))
    const blank = draft.some((d) => d.word.trim() === '')

    const update = (index: number, patch: Partial<DraftCard>) => {
        setMessage('')
        setDraft((list) => list.map((d, i) => (i === index ? { ...d, ...patch } : d)))
    }
    const move = (index: number, by: number) => {
        setMessage('')
        setDraft((list) => {
            const next = [...list]
            const target = index + by
            if (target < 0 || target >= next.length) return list
            ;[next[index], next[target]] = [next[target], next[index]]
            return next
        })
    }
    const remove = (index: number) => {
        setMessage('')
        setDraft((list) => list.filter((_, i) => i !== index))
    }
    const add = () => {
        setMessage('')
        setDraft((list) => [...list, { word: '', emoji: '' }])
    }
    const onSave = () => {
        save.mutate(
            { setId, letter: letter.lower, items: draft.filter((d) => d.word.trim() !== ''), oldIds: saved.map((c) => c.id) },
            { onSuccess: () => setMessage('Saved'), onError: () => setMessage('Could not save. Try again.') },
        )
    }

    return (
        <section className="flex flex-col gap-2 rounded-2xl border border-gray-900/10 bg-white p-3 shadow-sm dark:border-gray-100/10 dark:bg-gray-900">
            <div className="flex items-baseline justify-between">
                <h2 className="text-xl font-extrabold text-gray-900 dark:text-gray-50">
                    {letter.upper}
                    {letter.lower}
                </h2>
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">sound /{letter.letter_sound.replace(/\//g, '')}/</span>
            </div>
            {draft.length === 0 && (
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                    No cards saved for this letter, so pupils see the built-in word ({letter.word}).
                </p>
            )}
            {draft.map((card, index) => (
                <CardRow
                    key={index}
                    letter={letter.lower}
                    language={letter.language}
                    card={card}
                    isMain={index === 0}
                    onChange={(patch) => update(index, patch)}
                    onUp={() => move(index, -1)}
                    onDown={() => move(index, 1)}
                    onRemove={() => remove(index)}
                    canUp={index > 0}
                    canDown={index < draft.length - 1}
                />
            ))}
            <div className="mt-1 flex flex-wrap items-center gap-2">
                <button className={secondary} onClick={add}>
                    <span className="inline-flex items-center gap-1">
                        <Plus size={14} /> Add object
                    </span>
                </button>
                <button className={primary} onClick={onSave} disabled={!dirty || blank || save.isPending}>
                    {save.isPending ? 'Saving…' : 'Save'}
                </button>
                {message && <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{message}</span>}
            </div>
        </section>
    )
}

function CardRow({
    letter,
    language,
    card,
    isMain,
    onChange,
    onUp,
    onDown,
    onRemove,
    canUp,
    canDown,
}: {
    letter: string
    language: FoundationalLanguage
    card: DraftCard
    isMain: boolean
    onChange: (patch: Partial<DraftCard>) => void
    onUp: () => void
    onDown: () => void
    onRemove: () => void
    canUp: boolean
    canDown: boolean
}) {
    const word = card.word.trim().toLowerCase()
    // Same picture choice as the scene: aliased names, and our own drawing for a few words.
    const usesDrawing = language === 'en' && PREFER_DRAWING.has(word)
    const found = useWordImageQuery(usesDrawing ? null : (language === 'en' ? PICTURE_ALIASES[normalizeImageWord(word)] : undefined) ?? (word || null), language).data
    const library = usesDrawing ? undefined : found
    // x is the one letter taught from the END of its word (box, fox).
    const offLetter = word !== '' && !(letter === 'x' && language === 'en') && letter !== 'ñ' && !word.startsWith(letter)
    return (
        <div className="flex items-start gap-2 rounded-xl bg-gray-900/[0.03] p-2 dark:bg-gray-100/[0.05]">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white text-3xl dark:bg-gray-950">
                {library ? <img src={library.url} alt="" className="h-full w-full object-contain" /> : <span aria-hidden="true">{card.emoji || '?'}</span>}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
                <input
                    className={input}
                    value={card.word}
                    maxLength={40}
                    placeholder={isMain ? 'Main word' : 'Word'}
                    aria-label={isMain ? 'Main word' : 'Word'}
                    onChange={(e) => onChange({ word: e.target.value })}
                />
                <input
                    className={input}
                    value={card.emoji}
                    maxLength={16}
                    placeholder="Emoji (Windows: Win + .)"
                    aria-label="Emoji"
                    onChange={(e) => onChange({ emoji: e.target.value })}
                />
                {offLetter && (
                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">Does not start with {letter.toUpperCase()}.</span>
                )}
                {library && <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Using the Word Pictures image.</span>}
                {usesDrawing && <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Shown as a BasaQuest drawing.</span>}
            </div>
            <div className="flex shrink-0 flex-col gap-1">
                <button aria-label="Move up" onClick={onUp} disabled={!canUp} className="cursor-pointer rounded p-1 text-gray-600 hover:bg-gray-900/10 disabled:opacity-30 dark:text-gray-300">
                    <ArrowUp size={14} />
                </button>
                <button aria-label="Move down" onClick={onDown} disabled={!canDown} className="cursor-pointer rounded p-1 text-gray-600 hover:bg-gray-900/10 disabled:opacity-30 dark:text-gray-300">
                    <ArrowDown size={14} />
                </button>
                <button aria-label="Remove" onClick={onRemove} className="cursor-pointer rounded p-1 text-red-600 hover:bg-red-500/10 dark:text-red-400">
                    <Trash2 size={14} />
                </button>
            </div>
        </div>
    )
}

export default FoundationalEditPage
