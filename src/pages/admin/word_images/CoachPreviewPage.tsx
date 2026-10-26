// File: src/pages/admin/word_images/CoachPreviewPage.tsx
// "Preview in coach": shows a word's picture exactly as a pupil sees it in
// the Reading Coach notebook. It mounts the real CoachTableBackdrop scene
// and the same CoachNotebookSlot component the coach page uses (both
// pulled out of RemediationCoachPage so nothing here is a look-alike copy),
// with a short sample sentence around the chosen word instead of a saved
// remediation material — which an admin account can't read anyway.
//
// Opened from the Word Pictures screen (?word=&lang=&from=word-images).
// Tap any word in the sample sentence to preview it too, or type another
// word / switch language in the floating panel.
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { ThemeToggleButton } from '../../../components/buttons/ThemeToggleButton.tsx'
import { useWordImageQuery } from '../../../hooks/useWordImage.ts'
import { usePronounceWord } from '../../students/remediation/session/features/usePronounceWord.ts'
import {
    CoachTableBackdrop,
    type CoachSentenceContent,
    type CoachTableBackdropHandle,
} from '../../students/remediation/coach/features/backdrop/CoachTableBackdrop.tsx'
import { CoachNotebookSlot } from '../../students/remediation/coach/features/CoachNotebookSlot.tsx'

type Lang = 'en' | 'fil'

const PLACEHOLDER: Record<Lang, string> = {
    en: 'Tap a word in the story to explore it.',
    fil: 'Pindutin ang isang salita sa kuwento para tingnan ito.',
}

// Same trim the coach applies when a word is tapped ("home." -> "home").
const stripPunctuation = (word: string) => word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')

// The previewed word sits mid-sentence with a trailing period, like a word
// in a real passage, so punctuation handling is part of what gets checked.
function sentenceFor(word: string, lang: Lang): CoachSentenceContent {
    const lead = lang === 'fil' ? ['Tingnan', 'ang', 'salitang'] : ['Look', 'at', 'the', 'word']
    const tail = lang === 'fil' ? ['Pindutin', 'ang', 'ibang', 'salita.'] : ['Tap', 'any', 'other', 'word.']
    const words = [...lead, `${word || '…'}.`, ...tail]
    return { words, targetIndices: [lead.length] }
}

export default function CoachPreviewPage() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const initialWord = searchParams.get('word') ?? ''
    const [lang, setLang] = useState<Lang>(searchParams.get('lang') === 'fil' ? 'fil' : 'en')
    const [inputWord, setInputWord] = useState(initialWord)
    const [selectedWord, setSelectedWord] = useState<string | null>(initialWord || null)
    const [open, setOpen] = useState(true)
    const backdropRef = useRef<CoachTableBackdropHandle>(null)
    const { speak } = usePronounceWord()
    const { data: wordImage } = useWordImageQuery(selectedWord, lang)

    const content = useMemo(() => sentenceFor(inputWord, lang), [inputWord, lang])
    const firstRender = useRef(true)
    useEffect(() => {
        // initialContent paints the first render; later edits (a typed word,
        // the language switch) repaint in place without a page turn.
        if (firstRender.current) {
            firstRender.current = false
            return
        }
        backdropRef.current?.setCurrentContent(content)
    }, [content])

    const applyTypedWord = (value: string) => {
        setInputWord(value)
        const clean = stripPunctuation(value)
        setSelectedWord(clean || null)
        setOpen(true)
    }

    return (
        <div
            className="fixed inset-0 flex items-center justify-end overflow-hidden bg-[#c9701f] dark:bg-[#150d33]"
            style={{ containerType: 'size' } as CSSProperties}
        >
            <style>{`
                @media (max-aspect-ratio: 4/3) {
                    .coach-stage { width: 100cqw !important; }
                }
            `}</style>
            <div
                className="coach-stage relative"
                style={{ width: 'max(100cqw, calc(100cqh * 1670 / 941))', aspectRatio: '1670 / 941' }}
            >
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

            <button
                type="button"
                onClick={() => navigate('/admin/word-images')}
                aria-label="Back to word pictures"
                className="fixed left-4 top-4 z-40 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-gray-900/10 bg-white/85 text-gray-700 shadow-md backdrop-blur-sm transition-colors duration-200 hover:bg-white dark:border-gray-100/10 dark:bg-gray-900/80 dark:text-gray-200 dark:hover:bg-gray-900"
            >
                <LogOut size={18} />
            </button>
            <div className="fixed right-4 top-4 z-40">
                <ThemeToggleButton />
            </div>

            {/* Floating panel: preview a different word or language. */}
            <div className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-2xl border border-gray-900/10 bg-white/90 p-2 shadow-md backdrop-blur-sm dark:border-gray-100/10 dark:bg-gray-900/85">
                <input
                    value={inputWord}
                    onChange={(e) => applyTypedWord(e.target.value)}
                    placeholder="Try a word…"
                    aria-label="Word to preview"
                    className="w-40 rounded-xl border-2 border-gray-900/10 bg-white px-3 py-1.5 text-sm font-semibold text-gray-900 outline-none focus:border-teal-500 dark:border-gray-100/10 dark:bg-gray-950 dark:text-gray-50"
                />
                {(['en', 'fil'] as Lang[]).map((l) => (
                    <button
                        key={l}
                        type="button"
                        aria-pressed={lang === l}
                        onClick={() => setLang(l)}
                        className={`cursor-pointer rounded-full px-3 py-1.5 text-sm font-bold ${
                            lang === l
                                ? 'bg-teal-500 text-white dark:bg-teal-600'
                                : 'border border-gray-900/10 text-gray-600 dark:border-gray-100/10 dark:text-gray-300'
                        }`}
                    >
                        {l === 'en' ? 'English' : 'Filipino'}
                    </button>
                ))}
            </div>
        </div>
    )
}
