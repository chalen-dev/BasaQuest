// File: src/pages/proficiency/remediation/session/RemediationSessionPage.tsx
//
// Word-for-word practice session (the table, book, owl and word notebook).
// The scene is the standalone prototype in public/remediation-practice.html,
// shown full-bleed in an iframe. That keeps its own styles and scripts from
// touching the rest of the app, and lets a newer version of the prototype be
// dropped in as one file.
//
// NOT WIRED YET: the prototype still runs on its sample word list and does
// not save anything. Wiring it up means passing the pupil's real words in and
// saving each "practiced" toggle (see the old page's persistence notes in
// git history). The only link to the app today is Leave practice, which sends
// a message that returns to this pupil's remediation list.
import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

const PROTOTYPE_URL = '/remediation-practice.html'

export default function RemediationSessionPage() {
    const { studentId } = useParams<{ studentId: string }>()
    const navigate = useNavigate()

    useEffect(() => {
        const onMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return
            if (event.data?.type === 'word-practice:exit') navigate(`/students/remediation/${studentId}`)
        }
        window.addEventListener('message', onMessage)
        return () => window.removeEventListener('message', onMessage)
    }, [navigate, studentId])

    return (
        <iframe
            title="Word practice"
            src={PROTOTYPE_URL}
            allow="microphone; autoplay"
            className="fixed inset-0 h-full w-full border-0"
        />
    )
}
