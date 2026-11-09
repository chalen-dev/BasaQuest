// File: src/pages/proficiency/foundational/LettersScene.tsx
//
// Level 1 (Letters & Sounds): the blackboard classroom. The scene is the
// standalone page public/letters-practice.html (letter tabs, flashcard, owl),
// shown full-bleed in an iframe, the same way the word practice session is.
// It is same-origin, so this page talks to it through window hooks the scene
// defines, plus two messages back:
//
//   lettersLoad(list)     this page -> scene: the level's [{word, sound}], A to Z
//   lettersSpeaking(bool) this page -> scene: the voice is loading (spinner)
//   lettersTalking(bool)  this page -> scene: the voice is playing (owl talks)
//   lettersSpeak(word)    scene -> this page: "Hear it" (server voice)
//   letters:exit / letters:stop (messages): leave the page / stop the voice
//
// The pictures live in the scene and are drawn per letter, so the words in
// data/en/level1.ts must stay one per letter in A-Z order with the keyword the
// picture shows. Progress is not saved yet.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePronounceWord } from '../remediation/session/features/usePronounceWord.ts'
import type { FoundationalLetter } from './data/types.ts'

type SceneWindow = Window & {
    lettersLoad?: (list: { word: string; sound: string }[]) => void
    lettersSpeak?: (word: string) => void
    lettersSpeaking?: (loading: boolean) => void
    lettersTalking?: (talking: boolean) => void
}

const SCENE_URL = '/letters-practice.html'

export default function LettersScene({ letters }: { letters: FoundationalLetter[] }) {
    const navigate = useNavigate()
    const { speak, stop, isLoading, isPlaying } = usePronounceWord()
    const [sceneWin, setSceneWin] = useState<SceneWindow | null>(null)

    // One entry per letter, A to Z, with the sound without its slashes ("/m/" -> "m").
    const list = useMemo(
        () =>
            [...letters]
                .sort((a, b) => a.lower.localeCompare(b.lower))
                .map((letter) => ({ word: letter.word, sound: letter.letter_sound.replace(/\//g, '') })),
        [letters],
    )

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
        }
        window.addEventListener('message', onMessage)
        return () => window.removeEventListener('message', onMessage)
    }, [navigate])

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
