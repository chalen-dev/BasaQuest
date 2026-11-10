// File: src/pages/proficiency/foundational/LettersScene.tsx
//
// Level 1 (Letters & Sounds): the blackboard classroom. The scene is the
// standalone page public/letters-practice.html (letter tabs, flashcard, owl),
// shown full-bleed in an iframe, the same way the word practice session is.
// It is same-origin, so this page talks to it through window hooks the scene
// defines, plus messages back:
//
//   lettersLoad(list)     this page -> scene: the level's letters A to Z, each
//                         {word, sound, image (emoji), imageUrl, extras: [...]}
//   lettersTheme(night, instant)  this page -> scene: the website's day/night setting (the scene's
//                         own switch sends letters:theme back, and this page flips the website's theme)
//   lettersCanEdit(bool)  this page -> scene: show the "Edit cards" button
//   lettersSpeaking(bool) this page -> scene: the voice is loading (spinner)
//   lettersTalking(bool)  this page -> scene: the voice is playing (owl talks)
//   lettersSpeak(word)    scene -> this page: "Hear it" (server voice)
//   letters:exit / letters:stop / letters:edit (messages): leave / stop the
//                         voice / open the card editor
//
// What each letter shows comes from the cards set this person gets (the shared
// default, or their teacher's own; see hooks.ts), falling back to the built-in
// data in data/en/level1.ts while it loads or if it cannot be read. A picture is
// the drawing in public/letters-art.js for the word, else the Word Pictures
// library image, else the emoji. Progress is not saved yet.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { prefetchAudio, preloadAudio, usePronounceWord } from '../remediation/session/features/usePronounceWord.ts'
import { OwlLoader } from '../../../components/ui/OwlLoader.tsx'
import { useProfile } from '../../../hooks/useProfile.ts'
import { useTheme } from '../../../contexts/ThemeContext.tsx'
import type { FoundationalLanguage, FoundationalLetter } from './data/types.ts'
import { buildSceneLetters, useFoundationalSetQuery, useLibraryPicturesQuery, type SceneLetter } from './hooks.ts'

type SceneWindow = Window & {
    lettersLoad?: (list: SceneLetter[], language: FoundationalLanguage) => void
    lettersCanEdit?: (canEdit: boolean) => void
    lettersSpeak?: (word: string) => void
    lettersSpeaking?: (loading: boolean) => void
    lettersTalking?: (talking: boolean) => void
    lettersTheme?: (night: boolean, instant?: boolean) => void
}

const SCENE_URL = '/letters-practice.html'

export default function LettersScene({ levelId, language, letters }: { levelId: string; language: FoundationalLanguage; letters: FoundationalLetter[] }) {
    const navigate = useNavigate()
    const { profile, loading: profileLoading } = useProfile()
    const { theme, toggleTheme } = useTheme()
    const { speak, stop, isLoading, isPlaying } = usePronounceWord()
    const [sceneWin, setSceneWin] = useState<SceneWindow | null>(null)
    const setQuery = useFoundationalSetQuery(levelId)

    // Every word the pupil could see, so the library pictures arrive in one go.
    const cards = setQuery.data?.cards
    const allWords = useMemo(
        () => (cards && cards.length ? cards.map((c) => c.word) : letters.flatMap((l) => [l.word, ...(l.extra_words ?? []).map((e) => e.word)])),
        [cards, letters],
    )
    const pictures = useLibraryPicturesQuery(allWords, language).data
    const list = useMemo(() => buildSceneLetters(letters, cards, pictures), [letters, cards, pictures])

    const canEdit = profile?.role === 'teacher' || profile?.role === 'admin'

    // The voice clips are loaded BEFORE the scene opens, so "Hear it" plays at once. The 26 main words
    // are awaited (up to a few seconds); the extra objects load quietly afterwards. The scene itself
    // loads behind the owl in the meantime.
    const [audioReady, setAudioReady] = useState(false)
    const cardsSettled = !profileLoading && !setQuery.isLoading
    const mainWords = list.map((l) => l.word).join('|')
    const extraWords = list.flatMap((l) => l.extras.map((e) => e.word)).join('|')
    useEffect(() => {
        if (!cardsSettled) return
        let cancelled = false
        void preloadAudio(mainWords.split('|'), language).then(() => {
            if (!cancelled) setAudioReady(true)
        })
        if (extraWords) extraWords.split('|').forEach((word) => prefetchAudio(word, language))
        return () => {
            cancelled = true
        }
    }, [cardsSettled, mainWords, extraWords, language])
    // Never keep the scene closed for long: if something above stalls, open it anyway.
    useEffect(() => {
        const id = window.setTimeout(() => setAudioReady(true), 12000)
        return () => window.clearTimeout(id)
    }, [])

    const speakRef = useRef(speak)
    useEffect(() => {
        speakRef.current = speak
    }, [speak])
    const stopRef = useRef(stop)
    useEffect(() => {
        stopRef.current = stop
    }, [stop])

    useEffect(() => {
        sceneWin?.lettersLoad?.(list, language)
    }, [sceneWin, list, language])

    // The scene follows the website's day/night setting; its own switch flips the website's.
    const themeRef = useRef(theme)
    const toggleThemeRef = useRef(toggleTheme)
    useEffect(() => {
        themeRef.current = theme
        toggleThemeRef.current = toggleTheme
    }, [theme, toggleTheme])
    const themed = useRef(false)
    useEffect(() => {
        if (!sceneWin) return
        sceneWin.lettersTheme?.(theme === 'dark', !themed.current)
        themed.current = true
    }, [sceneWin, theme])

    useEffect(() => {
        sceneWin?.lettersCanEdit?.(canEdit)
    }, [sceneWin, canEdit])

    useEffect(() => {
        sceneWin?.lettersSpeaking?.(isLoading)
    }, [sceneWin, isLoading])

    useEffect(() => {
        sceneWin?.lettersTalking?.(isPlaying)
    }, [sceneWin, isPlaying])

    useEffect(() => {
        const onMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return
            if (event.data?.type === 'letters:exit') navigate('/reading/proficiency')
            if (event.data?.type === 'letters:stop') stopRef.current()
            if (event.data?.type === 'letters:theme' && (event.data.night === true) !== (themeRef.current === 'dark')) toggleThemeRef.current()
            if (event.data?.type === 'letters:edit') navigate(`/reading/proficiency/foundational/${levelId}/edit`)
        }
        window.addEventListener('message', onMessage)
        return () => window.removeEventListener('message', onMessage)
    }, [navigate, levelId])

    // Scene -> page hook, set when the frame loads (it lives on the frame's own window).
    const bindScene = (win: SceneWindow | null) => {
        if (!win) return
        win.lettersSpeak = (word) => {
            void speakRef.current(word, language)
        }
        setSceneWin(win)
    }

    return (
        <>
            <iframe
                title="Letters & Sounds"
                src={SCENE_URL}
                allow="autoplay"
                onLoad={(e) => bindScene(e.currentTarget.contentWindow as SceneWindow | null)}
                className={`fixed inset-0 z-[60] h-full w-full border-0 ${audioReady ? '' : 'invisible'}`}
            />
            {!audioReady && <OwlLoader className="fixed inset-0 z-[61] flex items-center justify-center bg-white dark:bg-gray-950" />}
        </>
    )
}
