// File: src/pages/students/remediation/coach/features/useScoreSentence.ts
// Client side of Reading Coach Mode's sentence scoring call. A
// synchronous round trip to basaquest-scoring (not fire-and-forget — the
// mutation's own result IS the score), the raw recorded Blob sent
// directly as the request body, target info passed as query params,
// bearer token as the auth header.
//
// LIVE WORD-BY-WORD FEEDBACK: the result also carries `words` — one
// entry per word in the sentence (0-based, matching the sentenceWords
// array sent in the request), each with its own systemVerdict
// ('correct'/'miscue'). RemediationCoach.tsx uses this to color the
// whole sentence after an attempt, not just the target word — though
// `passed` above still only reflects the target word, per the product
// decision that a slip elsewhere in the sentence never blocks moving on
// from it.
//
// sentenceWords is sent as a JSON-encoded query param (POST /score-sentence
// in index.js parses it back out) since there's no request body left
// for it once the body is the raw audio itself.
import { useMutation } from '@tanstack/react-query'
import { supabase } from '../../../../../lib/supabaseClient.ts'
import type { Lang } from '../../../../../components/buttons/LangToggle.tsx'
const SCORING_SERVICE_URL = import.meta.env.VITE_SCORING_SERVICE_URL as string | undefined
export type ScoreSentenceArgs = {
    sentenceWords: string[]
    targetIndex: number
    language: Lang
    blob: Blob
}
export type ScoredWord = {
    wordIndex: number
    referenceWord: string | null
    recognizedWord: string | null
    errorType: 'None' | 'Omission' | 'Insertion' | 'Mispronunciation'
    accuracyScore: number | null
    systemVerdict: 'correct' | 'miscue'
}
export type ScoreSentenceResult = {
    recognizedWord: string | null
    accuracyScore: number | null
    passed: boolean
    words: ScoredWord[]
}
export function useScoreSentence() {
    return useMutation({
        mutationFn: async ({ sentenceWords, targetIndex, language, blob }: ScoreSentenceArgs): Promise<ScoreSentenceResult> => {
            // Only English has a scoring pipeline wired up (Azure
            // Pronunciation Assessment via basaquest-scoring) — same
            // limitation as the full-passage flow (useSubmitAttempt.ts).
            if (language !== 'en') {
                throw new Error('Only the English scoring flow is implemented right now.')
            }
            if (!SCORING_SERVICE_URL) {
                throw new Error('Scoring service is not configured.')
            }
            const { data: sessionData } = await supabase.auth.getSession()
            const accessToken = sessionData.session?.access_token
            if (!accessToken) {
                throw new Error('No active session.')
            }
            const url = `${SCORING_SERVICE_URL}/score-sentence?words=${encodeURIComponent(JSON.stringify(sentenceWords))}&targetIndex=${targetIndex}&language=${encodeURIComponent(language)}`
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': blob.type || 'audio/webm',
                },
                body: blob,
            })
            if (!res.ok) {
                const detail = await res.text().catch(() => '')
                throw new Error(`Scoring request failed (${res.status}). ${detail}`)
            }
            return (await res.json()) as ScoreSentenceResult
        },
    })
}