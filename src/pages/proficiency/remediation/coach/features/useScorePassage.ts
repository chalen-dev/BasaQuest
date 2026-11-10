// File: src/pages/proficiency/remediation/coach/features/useScorePassage.ts
//
// Client side of Reading Coach Mode's whole-passage scoring call (POST
// /score-passage on basaquest-scoring). The pupil reads the passage on the page
// aloud; the recording goes up as the raw request body, the passage's words go
// as a JSON query parameter, and the answer is one verdict per word, which the
// Coach paints onto the page (green correct, orange mispronounced, red skipped).
//
// Nothing is stored anywhere: no attempt row, no word rows, and the audio is
// dropped as soon as it has been scored (same "ephemeral" shape as
// useScoreSentence, which scores a single sentence).
//
// The service turns a take away before paying for it when it is too long or has
// no voice in it, answering 422 with a `code`; that surfaces here as a
// ScorePassageError so the page can tell the pupil what to do.
import { useMutation } from '@tanstack/react-query'
import { supabase } from '../../../../../lib/supabaseClient.ts'
import type { Lang } from '../../../../../components/buttons/LangToggle.tsx'

const SCORING_SERVICE_URL = import.meta.env.VITE_SCORING_SERVICE_URL as string | undefined

export type ScorePassageArgs = {
    /** The passage's words exactly as shown on the page, punctuation included. */
    words: string[]
    language: Lang
    blob: Blob
}

export type PassageWordResult = {
    /** 0-based, matches `words` in the request. */
    wordIndex: number
    referenceWord: string | null
    recognizedWord: string | null
    errorType: 'None' | 'Omission' | 'Insertion' | 'Mispronunciation'
    accuracyScore: number | null
    systemVerdict: 'correct' | 'miscue'
}

export type ScorePassageResult = {
    durationSeconds: number | null
    voicedSeconds: number
    words: PassageWordResult[]
}

export class ScorePassageError extends Error {
    /** 'silent' / 'too_long' when the service turned the take away, 'rate_limited' when this
     *  account has checked too many readings lately; null otherwise. */
    code: 'silent' | 'too_long' | 'rate_limited' | null
    constructor(message: string, code: 'silent' | 'too_long' | 'rate_limited' | null = null) {
        super(message)
        this.name = 'ScorePassageError'
        this.code = code
    }
}

export function useScorePassage() {
    return useMutation({
        mutationFn: async ({ words, language, blob }: ScorePassageArgs): Promise<ScorePassageResult> => {
            // English is scored by Azure pronunciation assessment, Filipino by the
            // separate Filipino model; the scoring service picks by `language`.
            if (!SCORING_SERVICE_URL) {
                throw new ScorePassageError('Scoring service is not configured.')
            }
            const { data: sessionData } = await supabase.auth.getSession()
            const accessToken = sessionData.session?.access_token
            if (!accessToken) {
                throw new ScorePassageError('No active session.')
            }
            const url = `${SCORING_SERVICE_URL}/score-passage?words=${encodeURIComponent(JSON.stringify(words))}&language=${encodeURIComponent(language)}`
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': blob.type || 'audio/webm',
                },
                body: blob,
            })
            if (!res.ok) {
                const body = (await res.json().catch(() => null)) as { error?: string; code?: string } | null
                const code = body?.code === 'silent' || body?.code === 'too_long' || body?.code === 'rate_limited' ? body.code : null
                throw new ScorePassageError(`Scoring request failed (${res.status}). ${body?.error ?? ''}`.trim(), code)
            }
            return (await res.json()) as ScorePassageResult
        },
    })
}
