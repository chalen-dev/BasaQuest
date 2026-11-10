// File: src/pages/proficiency/remediation/session/RemediationSessionPage.tsx
//
// Word-for-word practice session (the table, book, owl and word notebook).
// The scene is the standalone prototype in public/remediation-practice.html,
// shown full-bleed in an iframe so its own styles and scripts stay away from
// the rest of the app. The iframe is same-origin, so this page talks to it
// through three window hooks the prototype defines (see the end of its script):
//
//   wordPracticeLoad(list)      this page -> scene: the pupil's real words
//   onWordPracticeChange(flags) scene -> this page: every word's practiced flag
//   wordPracticeSpeak(word)     scene -> this page: "Hear it" (server voice)
//   wordPracticeSpeaking(bool)  this page -> scene: voice is loading (spinner)
//   wordPracticeTalking(bool)   this page -> scene: voice is playing (owl talks)
//   wordPracticeVerify(word, blob)  scene -> this page: the pupil's recording of one word
//                               goes to the scoring service; resolves to
//                               'correct' | 'mispronounced' | 'omitted' | 'silent'
//
// PERSISTENCE: every practiced toggle saves straight away
// (useUpdateRemediationProgressMutation, which also stamps last_practiced_at),
// so there is no save-on-exit step. `wordsRef` is the pupil's word list with the
// latest flags, kept outside React state because the scene owns the UI and this
// page only needs the list when it saves. Leave practice (from the scene's
// summary dialog) saves once more and returns to the pupil's remediation list.
//
// PRONUNCIATION: the server voice (usePronounceWord), not the browser's, because
// device voices say Filipino words wrongly, which defeats the purpose here.
//
// VERIFY: the recording of a word is scored by the scoring service (the same
// /score-passage call the Reading Coach uses, with a one-word "passage"). A
// correct reading marks the word practiced in the scene; nothing is stored.
//
// THEME: the scene follows the website's day/night setting (wordPracticeTheme),
// and its own switch flips the website's (word-practice:theme message).
//
// NOT WIRED YET: the owl's "Appeared Nx" count source beyond `count`.
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Owl } from '../../../../components/ui/Owl'
import { OwlLoader } from '../../../../components/ui/OwlLoader'
import { useLang } from '../../../../contexts/LangContext'
import { useTheme } from '../../../../contexts/ThemeContext'
import {
    readPracticed,
    useRemediationMaterialQuery,
    useUpdateRemediationProgressMutation,
    type RemediationWordEntry,
} from '../hooks'
import { usePronounceWord } from './features/usePronounceWord'
import { ScorePassageError, useScorePassage } from '../coach/features/useScorePassage'

const PROTOTYPE_URL = '/remediation-practice.html'

type SceneWindow = Window & {
    wordPracticeLoad?: (list: SceneWord[]) => void
    onWordPracticeChange?: (flags: boolean[]) => void
    wordPracticeSpeak?: (word: string) => void
    wordPracticeSpeaking?: (loading: boolean) => void
    wordPracticeTalking?: (talking: boolean) => void
    wordPracticeTheme?: (night: boolean) => void
    wordPracticeVerify?: (word: string, blob: Blob) => Promise<'correct' | 'mispronounced' | 'omitted' | 'silent'>
}
type SceneWord = { word: string; type: string; count: number; tip: string; practiced: boolean }

// A tip for words that have no generated one, in the material's own language
// (an English material gets English tips, a Filipino one Filipino).
function fallbackTip(entry: RemediationWordEntry, language: 'en' | 'fil'): string {
    if (language === 'en') {
        return entry.errorType === 'Omission'
            ? `Don't skip the word "${entry.word}".`
            : `Say it clearly: ${entry.word}.`
    }
    return entry.errorType === 'Omission'
        ? `Huwag laktawan ang salitang ${entry.word}.`
        : `Bigkasin nang malinaw: ${entry.word}.`
}

const NOTE = {
    fil: {
        notFoundTitle: 'Hindi mahanap ang pagsasanay',
        notFoundDesc: 'Maaaring natanggal na ito o wala kang access dito.',
        emptyTitle: 'Walang salitang sasanayin',
        emptyDesc: 'Walang mga salita sa materyal na ito.',
        back: 'Bumalik',
    },
    en: {
        notFoundTitle: "Couldn't find this practice",
        notFoundDesc: 'It may have been removed, or you may not have access.',
        emptyTitle: 'No words to practice',
        emptyDesc: 'This material has no words in it.',
        back: 'Go back',
    },
} as const

export default function RemediationSessionPage() {
    const { studentId, materialId } = useParams<{ studentId: string; materialId: string }>()
    const navigate = useNavigate()
    const { lang } = useLang()
    const t = NOTE[lang]

    const { data: material, isLoading, error } = useRemediationMaterialQuery(materialId)
    const updateProgress = useUpdateRemediationProgressMutation()
    const { speak, isLoading: voiceLoading, isPlaying: voicePlaying } = usePronounceWord()

    // The scene's own window, once its page has loaded.
    const [sceneWin, setSceneWin] = useState<SceneWindow | null>(null)
    const [sceneReady, setSceneReady] = useState(false)
    const wordsRef = useRef<RemediationWordEntry[] | null>(null)
    const materialRef = useRef(material)
    useEffect(() => {
        materialRef.current = material
    }, [material])
    // Always the latest speak(), without re-binding the scene's hook on every render.
    const speakRef = useRef(speak)
    useEffect(() => {
        speakRef.current = speak
    }, [speak])

    const scoreWord = useScorePassage()
    const scoreRef = useRef(scoreWord.mutateAsync)
    useEffect(() => {
        scoreRef.current = scoreWord.mutateAsync
    }, [scoreWord.mutateAsync])

    const updateRef = useRef(updateProgress.mutate)
    useEffect(() => {
        updateRef.current = updateProgress.mutate
    }, [updateProgress.mutate])

    const goBack = useCallback(() => navigate(`/students/remediation/${studentId}`), [navigate, studentId])

    // Hand the real words to the scene once both it and the data are there. The
    // list is seeded once; later refetches (our own saves) never overwrite it.
    useEffect(() => {
        const win = sceneWin
        if (!material || !win?.wordPracticeLoad || wordsRef.current) return
        if (material.words.length === 0) return
        wordsRef.current = material.words
        win.wordPracticeLoad(
            material.words.map((w) => ({
                word: w.word,
                type: w.errorType,
                count: w.count,
                tip: w.coachTip || fallbackTip(w, material.language),
                practiced: readPracticed(w),
            })),
        )
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSceneReady(true)
    }, [sceneWin, material])

    // Spinner on Hear it while the voice is being fetched.
    useEffect(() => {
        sceneWin?.wordPracticeSpeaking?.(voiceLoading)
    }, [sceneWin, voiceLoading])

    // The scene follows the website's day/night setting; its own switch flips the website's.
    const { theme, toggleTheme } = useTheme()
    const themeRef = useRef(theme)
    const toggleThemeRef = useRef(toggleTheme)
    useEffect(() => {
        themeRef.current = theme
        toggleThemeRef.current = toggleTheme
    }, [theme, toggleTheme])
    useEffect(() => {
        sceneWin?.wordPracticeTheme?.(theme === 'dark')
    }, [sceneWin, theme])

    // The owl talks while the voice plays.
    useEffect(() => {
        sceneWin?.wordPracticeTalking?.(voicePlaying)
    }, [sceneWin, voicePlaying])

    // Scene -> page hooks, set when the frame loads (an event handler, since they
    // live on the iframe's own window). They go away with the iframe.
    const bindScene = (win: SceneWindow | null) => {
        if (!win) return
        win.onWordPracticeChange = (flags) => {
            const current = wordsRef.current
            const mat = materialRef.current
            if (!current || !mat) return
            const next = current.map((w, i) => ({ ...w, practiced: flags[i] === true }))
            wordsRef.current = next
            updateRef.current({ id: mat.id, studentId: mat.student_id, words: next })
        }
        win.wordPracticeSpeak = (word) => {
            void speakRef.current(word, materialRef.current?.language ?? 'fil')
        }
        win.wordPracticeVerify = async (word, blob) => {
            try {
                const result = await scoreRef.current({ words: [word], language: materialRef.current?.language ?? 'fil', blob })
                const row = result.words.find((r) => r.wordIndex === 0)
                if (!row || row.errorType === 'Omission') return 'omitted'
                return row.errorType === 'None' ? 'correct' : 'mispronounced'
            } catch (err) {
                if (err instanceof ScorePassageError && err.code === 'silent') return 'silent'
                throw err
            }
        }
        setSceneWin(win)
    }

    // Leave practice (scene -> page message).
    useEffect(() => {
        const onMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return
            if (event.data?.type === 'word-practice:exit') goBack()
            if (event.data?.type === 'word-practice:theme' && (event.data.night === true) !== (themeRef.current === 'dark')) toggleThemeRef.current()
        }
        window.addEventListener('message', onMessage)
        return () => window.removeEventListener('message', onMessage)
    }, [goBack])

    if (isLoading) return <OwlLoader fullScreen />

    if (error || !material) return <Message title={t.notFoundTitle} desc={t.notFoundDesc} back={t.back} onBack={goBack} />
    if (material.words.length === 0) return <Message title={t.emptyTitle} desc={t.emptyDesc} back={t.back} onBack={goBack} />

    return (
        <>
            <iframe
                title="Word practice"
                src={PROTOTYPE_URL}
                allow="microphone; autoplay"
                onLoad={(e) => bindScene(e.currentTarget.contentWindow as SceneWindow | null)}
                // Hidden until the pupil's words are in, so the sample words never flash.
                className={`fixed inset-0 h-full w-full border-0 ${sceneReady ? '' : 'invisible'}`}
            />
            {!sceneReady && <OwlLoader fullScreen />}
        </>
    )
}

function Message({ title, desc, back, onBack }: { title: string; desc: string; back: string; onBack: () => void }) {
    return (
        <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
            <Owl mood="neutral" size={64} />
            <h2 className="text-xl font-extrabold text-gray-900 dark:text-gray-50">{title}</h2>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{desc}</p>
            <button
                type="button"
                onClick={onBack}
                className="mt-2 cursor-pointer rounded-full border border-gray-900/10 bg-white px-5 py-2 text-sm font-bold text-gray-700 shadow-sm dark:border-gray-100/10 dark:bg-gray-900 dark:text-gray-200"
            >
                {back}
            </button>
        </div>
    )
}
