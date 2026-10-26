// File: src/pages/admin/word_images/CueTester.tsx
// Type a sentence, tap a word, and see which picture the Reading Coach would
// show for it and why: the phrase it matched, or the cue words each meaning
// found nearby. Uses the same functions as the coach (src/lib/pictureSense.ts)
// on the pictures already loaded on this page, so a saved cue edit shows up
// here straight away.
import { useState } from 'react'
import { contextAround, explainPick, normalizeImageWord, type PickReason } from '../../../lib/pictureSense'
import type { PictureGroup } from '../_hooks/useWordImages.ts'

type Candidate = { word: string; sense: string; cues: string[]; is_default: boolean; url: string }

const EXAMPLES = {
    en: ['The boy spun the top on the floor', 'Close the top of the bottle', 'Mom uses the washing machine'],
    fil: ['Mainit ang araw ngayong umaga', 'Isang araw, naglaro kami sa bukid', 'Si Ana ay anak na babae ni Aling Rosa'],
} as const

const REASON_TEXT: Record<PickReason, string> = {
    only: 'This word has only one picture, so it is always used.',
    cues: 'Chosen because its cue words appear near the tapped word.',
    default: 'No cue word matched, so the meaning marked default is shown.',
    none: 'No cue word matched and no meaning is marked default, so the coach shows no picture (the placeholder).',
}

const inputClass =
    'w-full rounded-xl border-2 border-gray-900/10 bg-white px-3 py-2 text-sm font-semibold text-gray-900 outline-none focus:border-violet-500 dark:border-gray-100/10 dark:bg-gray-900 dark:text-gray-50'

function Picture({ c }: { c: Candidate }) {
    return (
        <img src={c.url} alt={c.sense || c.word} className="h-24 w-24 shrink-0 rounded-xl bg-gray-900/5 object-contain p-1 dark:bg-gray-100/5" />
    )
}

export function CueTester({ groups }: { groups: PictureGroup[] }) {
    const [language, setLanguage] = useState<'en' | 'fil'>('en')
    const [sentence, setSentence] = useState<string>(EXAMPLES.en[0])
    const [picked, setPicked] = useState<number | null>(null)

    const tokens = sentence.split(/\s+/).filter((t) => normalizeImageWord(t))

    // Every stored row of the chosen language, by its word (or phrase).
    const rowsByWord = new Map<string, Candidate[]>()
    for (const g of groups) {
        for (const w of g.words) {
            if (w.language !== language) continue
            const list = rowsByWord.get(w.word) ?? []
            list.push({ word: w.word, sense: g.sense, cues: g.cues, is_default: g.isDefault, url: g.url })
            rowsByWord.set(w.word, list)
        }
    }

    const key = picked !== null && tokens[picked] ? normalizeImageWord(tokens[picked]) : ''
    const { phrases, nearby } = key ? contextAround(key, tokens) : { phrases: [], nearby: [] as string[] }
    const phraseHit = phrases.find((p) => rowsByWord.has(p))
    const result = key && !phraseHit ? explainPick(rowsByWord.get(key) ?? [], nearby) : null

    const chooseLanguage = (next: 'en' | 'fil') => {
        setLanguage(next)
        setSentence(EXAMPLES[next][0])
        setPicked(null)
    }

    return (
        <div className="mt-5 flex flex-col gap-4 rounded-2xl border-2 border-violet-500/30 bg-white p-4 dark:bg-gray-900">
            <div>
                <h2 className="text-lg font-extrabold text-gray-900 dark:text-gray-50">Test cue words</h2>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    Type a sentence, then tap a word in it. You will see which picture a pupil would get, and which
                    cue words made the choice.
                </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                {(['en', 'fil'] as const).map((l) => (
                    <button
                        key={l}
                        type="button"
                        aria-pressed={language === l}
                        onClick={() => chooseLanguage(l)}
                        className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-bold ${
                            language === l
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
                onChange={(e) => {
                    setSentence(e.target.value)
                    setPicked(null)
                }}
                aria-label="Test sentence"
                placeholder="Type a sentence…"
                className={inputClass}
            />
            <div className="flex flex-wrap gap-1.5">
                {EXAMPLES[language].map((example) => (
                    <button
                        key={example}
                        type="button"
                        onClick={() => {
                            setSentence(example)
                            setPicked(null)
                        }}
                        className="cursor-pointer rounded-full bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-500/20 dark:text-violet-300"
                    >
                        {example}
                    </button>
                ))}
            </div>

            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Tap a word">
                {tokens.map((token, i) => (
                    <button
                        key={`${token}-${i}`}
                        type="button"
                        aria-pressed={picked === i}
                        onClick={() => setPicked(i)}
                        className={`cursor-pointer rounded-lg px-2.5 py-1 text-base font-bold ${
                            picked === i
                                ? 'bg-violet-600 text-white'
                                : 'bg-gray-900/5 text-gray-800 hover:bg-gray-900/10 dark:bg-gray-100/10 dark:text-gray-100'
                        }`}
                    >
                        {token}
                    </button>
                ))}
            </div>

            {!key ? (
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Tap a word above to test it.</p>
            ) : phraseHit ? (
                <div className="flex flex-col gap-2 rounded-xl bg-violet-500/10 p-3">
                    <p className="text-sm font-bold text-violet-700 dark:text-violet-300">
                        Phrase match: “{phraseHit}”. A phrase beats cue words.
                    </p>
                    <div className="flex items-center gap-3">
                        <Picture c={rowsByWord.get(phraseHit)![0]} />
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                            {rowsByWord.get(phraseHit)![0].sense || 'one picture for the phrase'}
                        </span>
                    </div>
                </div>
            ) : result ? (
                <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-2 rounded-xl bg-violet-500/10 p-3">
                        <p className="text-sm font-bold text-violet-700 dark:text-violet-300">
                            “{key}” — {result.pick ? REASON_TEXT[result.reason] : REASON_TEXT.none}
                        </p>
                        {result.pick ? (
                            <div className="flex items-center gap-3">
                                <Picture c={result.pick} />
                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                                    {result.pick.sense || 'ordinary picture'}
                                </span>
                            </div>
                        ) : (
                            <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                                {result.matches.length === 0 ? 'There is no picture for this word.' : 'Placeholder shown.'}
                            </p>
                        )}
                    </div>

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
