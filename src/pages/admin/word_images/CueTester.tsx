// File: src/pages/admin/word_images/CueTester.tsx
// Type a sentence and tap a word in it, laid out like the Reading Coach: the
// real coach table scene and word notebook (the same CoachTableBackdrop and
// CoachNotebookSlot a pupil sees) with the picture the coach would show. Under
// it, a breakdown of why: the phrase it matched, or the cue words each meaning
// found nearby. The picture comes from the same lookup the coach uses
// (useWordImageQuery); the breakdown runs the same functions as the coach
// (src/lib/pictureSense.ts) on the pictures already loaded on this page, so a
// saved cue edit shows up here straight away.
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { contextAround, explainPick, normalizeImageWord, type PickReason } from '../../../lib/pictureSense'
import { useWordImageQuery } from '../../../hooks/useWordImage.ts'
import { usePronounceWord } from '../../proficiency/remediation/session/features/usePronounceWord.ts'
import {
    CoachTableBackdrop,
    type CoachSentenceContent,
    type CoachTableBackdropHandle,
} from '../../proficiency/remediation/coach/features/backdrop/CoachTableBackdrop.tsx'
import { CoachNotebookSlot } from '../../proficiency/remediation/coach/features/CoachNotebookSlot.tsx'
import type { PictureGroup } from '../_hooks/useWordImages.ts'

type Lang = 'en' | 'fil'
type Candidate = { word: string; sense: string; cues: string[]; is_default: boolean; url: string }

const EXAMPLES: Record<Lang, string[]> = {
    en: ['The boy spun the top on the floor.', 'Close the top of the bottle.', 'Mom uses the washing machine.'],
    fil: ['Mainit ang araw ngayong umaga.', 'Isang araw, naglaro kami sa bukid.', 'Si Ana ay anak na babae ni Aling Rosa.'],
}

const PLACEHOLDER: Record<Lang, string> = {
    en: 'Tap a word in the story to explore it.',
    fil: 'Pindutin ang isang salita sa kuwento para tingnan ito.',
}

const REASON_TEXT: Record<PickReason, string> = {
    only: 'This word has only one picture, so it is always used.',
    cues: 'Chosen because its cue words appear near the tapped word.',
    default: 'No cue word matched, so the meaning marked default is shown.',
    none: 'No cue word matched and no meaning is marked default, so the coach shows no picture (the placeholder).',
}

const inputClass =
    'w-full rounded-xl border-2 border-gray-900/10 bg-white px-3 py-2 text-sm font-semibold text-gray-900 outline-none focus:border-violet-500 dark:border-gray-100/10 dark:bg-gray-900 dark:text-gray-50'

// Same trim the coach applies when a word is tapped ("home." -> "home").
const stripPunctuation = (word: string) => word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')

export function CueTester({ groups }: { groups: PictureGroup[] }) {
    const [lang, setLang] = useState<Lang>('en')
    const [sentence, setSentence] = useState(EXAMPLES.en[0])
    const [selectedWord, setSelectedWord] = useState<string | null>(null)
    const [open, setOpen] = useState(true)
    const backdropRef = useRef<CoachTableBackdropHandle>(null)
    const firstRender = useRef(true)
    const { speak } = usePronounceWord()

    const content = useMemo<CoachSentenceContent>(
        () => ({ words: sentence.trim().split(/\s+/).filter(Boolean), targetIndices: [] }),
        [sentence],
    )

    useEffect(() => {
        // initialContent paints the first render; later edits repaint in place.
        if (firstRender.current) {
            firstRender.current = false
            return
        }
        backdropRef.current?.setCurrentContent(content)
    }, [content])

    // The picture a pupil would get: the coach's own lookup, with the sentence as context.
    const { data: wordImage } = useWordImageQuery(selectedWord, lang, content.words)

    // The reasons: every stored row of the chosen language, by word or phrase.
    const rowsByWord = new Map<string, Candidate[]>()
    for (const g of groups) {
        for (const w of g.words) {
            if (w.language !== lang) continue
            const list = rowsByWord.get(w.word) ?? []
            list.push({ word: w.word, sense: g.sense, cues: g.cues, is_default: g.isDefault, url: g.url })
            rowsByWord.set(w.word, list)
        }
    }
    const key = selectedWord ? normalizeImageWord(selectedWord) : ''
    const { phrases, nearby } = key ? contextAround(key, content.words) : { phrases: [], nearby: [] as string[] }
    const phraseHit = phrases.find((p) => rowsByWord.has(p))
    const result = key && !phraseHit ? explainPick(rowsByWord.get(key) ?? [], nearby) : null

    const chooseSentence = (text: string) => {
        setSentence(text)
        setSelectedWord(null)
    }
    const chooseLanguage = (next: Lang) => {
        setLang(next)
        chooseSentence(EXAMPLES[next][0])
    }

    return (
        <div className="mt-5 flex flex-col gap-4 rounded-2xl border-2 border-violet-500/30 bg-white p-4 dark:bg-gray-900">
            <div>
                <h2 className="text-lg font-extrabold text-gray-900 dark:text-gray-50">Test cue words</h2>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    Type a sentence, then tap a word on the table. The notebook shows what a pupil would see in the
                    Reading Coach, and below it is why that picture was chosen.
                </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                {(['en', 'fil'] as const).map((l) => (
                    <button
                        key={l}
                        type="button"
                        aria-pressed={lang === l}
                        onClick={() => chooseLanguage(l)}
                        className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-bold ${
                            lang === l
                                ? 'bg-violet-600 text-white'
                                : 'border border-violet-500/40 text-violet-700 hover:bg-violet-500/10 dark:text-violet-300'
                        }`}
                    >
                        {l === 'en' ? 'English' : 'Filipino'}
                    </button>
                ))}
            </div>

            <input
                value={sentence}
                onChange={(e) => chooseSentence(e.target.value)}
                aria-label="Test sentence"
                placeholder="Type a sentence…"
                className={inputClass}
            />
            <div className="flex flex-wrap gap-1.5">
                {EXAMPLES[lang].map((example) => (
                    <button
                        key={example}
                        type="button"
                        onClick={() => chooseSentence(example)}
                        className="cursor-pointer rounded-full bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-500/20 dark:text-violet-300"
                    >
                        {example}
                    </button>
                ))}
            </div>

            {/* The coach scene in a box of its own: the notebook slot is sized in
            container units, so the box is a size-container with the coach's
            1670:941 stage inside it, as in CoachPreviewPage. */}
            <div
                className="relative w-full overflow-hidden rounded-2xl bg-[#c9701f] dark:bg-[#150d33]"
                style={{ containerType: 'size', aspectRatio: '1670 / 941' } as CSSProperties}
            >
                <div className="relative h-full w-full">
                    <CoachTableBackdrop
                        ref={backdropRef}
                        initialContent={content}
                        previousDisabled
                        nextDisabled
                        previousLabel="Previous"
                        nextLabel="Next"
                        onPrevious={() => {}}
                        onNext={() => {}}
                        onWordSelect={(word) => {
                            setSelectedWord(stripPunctuation(word) || word)
                            setOpen(true)
                        }}
                        selectedWord={selectedWord}
                        notebookOpen={open}
                    >
                        <CoachNotebookSlot
                            open={open}
                            animate
                            word={selectedWord}
                            image={wordImage}
                            onClose={() => setOpen(false)}
                            onPronounce={(word) => speak(word, lang)}
                            closeLabel="Close the notebook"
                            pronounceLabel="Pronounce"
                            placeholderText={PLACEHOLDER[lang]}
                        />
                    </CoachTableBackdrop>
                </div>
            </div>

            {!key ? (
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                    Tap a word on the table to see why its picture was chosen.
                </p>
            ) : phraseHit ? (
                <p className="rounded-xl bg-violet-500/10 p-3 text-sm font-bold text-violet-700 dark:text-violet-300">
                    Phrase match: “{phraseHit}”. A phrase beats cue words.
                </p>
            ) : result ? (
                <div className="flex flex-col gap-3">
                    <p className="rounded-xl bg-violet-500/10 p-3 text-sm font-bold text-violet-700 dark:text-violet-300">
                        “{key}” —{' '}
                        {result.matches.length === 0 ? 'There is no picture for this word.' : REASON_TEXT[result.reason]}
                    </p>
                    {result.matches.length > 1 && (
                        <ul className="flex flex-col gap-2">
                            {result.matches.map(({ row, matched }, i) => (
                                <li
                                    key={`${row.sense}-${i}`}
                                    className={`flex items-center gap-3 rounded-xl border-2 p-2 ${
                                        row === result.pick
                                            ? 'border-violet-500'
                                            : 'border-gray-900/10 dark:border-gray-100/10'
                                    }`}
                                >
                                    <img src={row.url} alt="" className="h-12 w-12 shrink-0 object-contain" />
                                    <div className="min-w-0 text-sm">
                                        <p className="font-bold text-gray-900 dark:text-gray-50">
                                            {row.sense || 'meaning not named'}
                                            {row.is_default && ' · default'}
                                            {row === result.pick && ' · shown'}
                                        </p>
                                        <p className="font-medium text-gray-600 dark:text-gray-300">
                                            Matched: {matched.length > 0 ? matched.join(', ') : 'none'}
                                            {row.cues.length > 0 && ` (cues: ${row.cues.join(', ')})`}
                                        </p>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                        Words the coach saw near “{key}”: {nearby.length > 0 ? nearby.join(', ') : 'none'}
                    </p>
                </div>
            ) : null}
        </div>
    )
}
