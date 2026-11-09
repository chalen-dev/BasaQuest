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
import { usePronounceWord } from '../remediation/session/features/usePronounceWord.ts'
import { useProfile } from '../../../hooks/useProfile.ts'
import type { FoundationalLetter } from './data/types.ts'
import { buildSceneLetters, useFoundationalSetQuery, useLibraryPicturesQuery, type SceneLetter } from './hooks.ts'

type SceneWindow = Window & {
    lettersLoad?: (list: SceneLetter[]) => void
    lettersCanEdit?: (canEdit: boolean) => void
    lettersSpeak?: (word: string) => void
    lettersSpeaking?: (loading: boolean) => void
    lettersTalking?: (talking: boolean) => void
}

const SCENE_URL = '/letters-practice.html'

export default function LettersScene({ levelId, letters }: { levelId: string; letters: FoundationalLetter[] }) {
    const navigate = useNavigate()
    const { profile } = useProfile()
    const { speak, stop, isLoading, isPlaying } = usePronounceWord()
    const [sceneWin, setSceneWin] = useState<SceneWindow | null>(null)
    const setQuery = useFoundationalSetQuery(levelId)

    // Every word the pupil could see, so the library pictures arrive in one go.
    const cards = setQuery.data?.cards
    const allWords = useMemo(
        () => (cards && cards.length ? cards.map((c) => c.word) : letters.flatMap((l) => [l.word, ...(l.extra_words ?? []).map((e) => e.word)])),
        [cards, letters],
    )
    const pictures = useLibraryPicturesQuery(allWords).data
    const list = useMemo(() => buildSceneLetters(letters, cards, pictures), [letters, cards, pictures])

    const canEdit = profile?.role === 'teacher' || profile?.role === 'admin'

    const speakRef = useRef(speak)
    useEffect(() => {
        speakRef.current = speak
    }, [speak])
    const stopRef = useRef(stop)
    useEffect(() => {
        stopRef.current = stop
    }, [stop])

    useEffect(() => {
        sceneWin?.lettersLoad?.(list)
    }, [sceneWin, list])

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
            if (event.data?.type === 'letters:edit') navigate(`/reading/proficiency/foundational/${levelId}/edit`)
        }
        window.addEventListener('message', onMessage)
        return () => window.removeEventListener('message', onMessage)
    }, [navigate, levelId])

    // Scene -> page hook, set when the frame loads (it lives on the frame's own window).
    const bindScene = (win: SceneWindow | null) => {
        if (!win) return
        win.lettersSpeak = (word) => {
            void speakRef.current(word, 'en')
        }
        setSceneWin(win)
    }

    return (
        <iframe
            title="Letters & Sounds"
            src={SCENE_URL}
            allow="autoplay"
            onLoad={(e) => bindScene(e.currentTarget.contentWindow as SceneWindow | null)}
            className="fixed inset-0 z-[60] h-full w-full border-0"
        />
    )
}
