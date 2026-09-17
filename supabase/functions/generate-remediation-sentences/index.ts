// File: supabase/functions/generate-remediation-sentences/index.ts
// Generates one short sentence per weak word for Reading Coach Mode
// (RemediationCoach.tsx) — modeled directly on generate-passage/index.ts's
// Gemini-calling pattern (same model, same server-side-only API key,
// same JSON-schema response), but batched: ONE Gemini call handles the
// whole word list for a generation event, rather than one call per
// word, to keep latency and API cost down. Called once, at
// remediation-material generation time (see AttemptResults.tsx's
// attachSentences()), never on the fly during Practice or Coach mode.
//
// Each returned sentence is pre-split into words with the target word's
// index marked (sentenceWords + targetIndex), rather than a plain
// string the caller would have to re-parse and hope the word appears
// verbatim exactly once — Gemini is asked to build the sentence FROM
// the word list directly, word by word, so there's no ambiguity about
// which token is the one being remediated.
//
// COACH TIP (this pass): each item also carries a short coachTip — a
// one-sentence reading tip about THAT word specifically (e.g. a sound
// to watch for, a syllable break, a common mix-up), shown by the owl's
// speech bubble in Reading Coach Mode's 'idle' state (see
// remediationCoachStrings.ts's header comment). Generated in the SAME
// Gemini call as the sentence — no extra round trip. If a word's
// coachTip is missing/invalid on the client side, RemediationCoach.tsx
// falls back to a static pool line instead (attachSentences() in
// AttemptResults.tsx handles that per-entry fallback).
//
// Called from the client via
// supabase.functions.invoke('generate-remediation-sentences', { body: { words, language } }).
// Requires the caller to be an authenticated user (default verify_jwt = true).
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const MODEL = 'gemini-3.5-flash-lite'
const MAX_WORDS_PER_REQUEST = 60
function buildPrompt(words: string[], lang: 'fil' | 'en'): string {
    const language = lang === 'fil' ? 'Filipino (Tagalog)' : 'English'
    return `You are helping a Filipino elementary school pupil practice reading specific words they struggle with, by seeing each word used in a short, natural sentence, plus a quick coaching tip for reading that word aloud.
For EACH word in this list, produce:
1. One short ${language} sentence (roughly 4-10 words) that uses that exact word naturally, then split that sentence into its individual words in order.
2. One short, warm coaching tip (roughly 8-20 words) a reading coach might say about THIS SPECIFIC word right before the pupil reads it aloud — e.g. a tricky sound in it, how many syllables it has, a common mix-up to watch for, or how to sound it out. Never generic ("do your best") — it must reference something about the actual word.
Words to cover, in order: ${JSON.stringify(words)}
Requirements per item:
- Content: warm, wholesome, everyday, culturally familiar to a Filipino child (home, school, barangay, nature, family, friendship) — never scary, violent, or sad.
- Plain, natural spoken rhythm — a child that age should be able to read the sentence aloud comfortably.
- The sentence MUST contain the exact target word (matching case-insensitively is fine, but don't substitute a different form of the word).
- "sentenceWords" is the sentence split into individual word tokens in reading order (punctuation can stay attached to its word, e.g. "bahay." is one token).
- "targetIndex" is the 0-based position of the target word inside "sentenceWords".
- "coachTip" is addressed directly to the pupil (e.g. "Listen for the soft 'ng' sound in the middle of this word."), in ${language}, and stays about the word itself, not the sentence.
- Return exactly one result per input word, in the same order as the input list, and set "word" to that exact input word unchanged.
Return ONLY the JSON array matching the response schema. No text outside the JSON.`
}
const RESPONSE_SCHEMA = {
    type: 'ARRAY',
    items: {
        type: 'OBJECT',
        properties: {
            word: { type: 'STRING', description: 'The exact input word this sentence is for, unchanged.' },
            sentenceWords: { type: 'ARRAY', items: { type: 'STRING' }, description: 'The sentence split into individual word tokens, in reading order.' },
            targetIndex: { type: 'INTEGER', description: '0-based index of the target word within sentenceWords.' },
            coachTip: { type: 'STRING', description: 'A short reading-coach tip about this specific word, addressed to the pupil.' },
        },
        required: ['word', 'sentenceWords', 'targetIndex', 'coachTip'],
    },
} as const
function jsonResponse(body: unknown, status: number) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
}
type SentenceItem = { word: string; sentenceWords: string[]; targetIndex: number; coachTip: string }
function isValidSentenceList(input: unknown): input is SentenceItem[] {
    if (!Array.isArray(input)) return false
    return input.every((item) => {
        if (!item || typeof item !== 'object') return false
        const a = item as Record<string, unknown>
        return (
            typeof a.word === 'string' &&
            a.word.trim().length > 0 &&
            Array.isArray(a.sentenceWords) &&
            a.sentenceWords.length > 0 &&
            a.sentenceWords.every((w) => typeof w === 'string' && w.trim().length > 0) &&
            typeof a.targetIndex === 'number' &&
            Number.isInteger(a.targetIndex) &&
            a.targetIndex >= 0 &&
            a.targetIndex < (a.sentenceWords as string[]).length &&
            typeof a.coachTip === 'string' &&
            a.coachTip.trim().length > 0
        )
    })
}
Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }
    try {
        if (req.method !== 'POST') {
            return jsonResponse({ error: 'Method not allowed' }, 405)
        }
        const apiKey = Deno.env.get('GEMINI_API_KEY')
        if (!apiKey) {
            console.error('generate-remediation-sentences: GEMINI_API_KEY is not set')
            return jsonResponse({ error: 'Server is not configured for sentence generation yet.' }, 500)
        }
        const body = await req.json().catch(() => null)
        const words = Array.isArray(body?.words) ? body.words.filter((w: unknown) => typeof w === 'string' && w.trim().length > 0) : null
        const lang = body?.language === 'en' ? 'en' : body?.language === 'fil' ? 'fil' : null
        if (!words || words.length === 0 || !lang) {
            return jsonResponse({ error: 'Expected { words: string[], language: "fil" | "en" } in the request body.' }, 400)
        }
        if (words.length > MAX_WORDS_PER_REQUEST) {
            return jsonResponse({ error: `Too many words in one request (max ${MAX_WORDS_PER_REQUEST}).` }, 400)
        }
        const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: buildPrompt(words, lang) }] }],
                    generationConfig: {
                        responseMimeType: 'application/json',
                        responseSchema: RESPONSE_SCHEMA,
                        temperature: 0.8,
                        maxOutputTokens: 260 * words.length + 200,
                    },
                }),
            },
        )
        if (!geminiRes.ok) {
            const detail = await geminiRes.text()
            console.error('generate-remediation-sentences: Gemini API error', geminiRes.status, detail)
            return jsonResponse({ error: 'The sentence generator is temporarily unavailable. Please try again.' }, 502)
        }
        const geminiData = await geminiRes.json()
        const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text
        let parsed: unknown
        try {
            parsed = typeof rawText === 'string' ? JSON.parse(rawText) : null
        } catch {
            parsed = null
        }
        if (!isValidSentenceList(parsed)) {
            console.error('generate-remediation-sentences: malformed Gemini payload', JSON.stringify(geminiData))
            return jsonResponse({ error: 'Got an unexpected response while generating sentences. Please try again.' }, 502)
        }
        return jsonResponse(parsed, 200)
    } catch (err) {
        console.error('generate-remediation-sentences: unexpected error', err)
        return jsonResponse({ error: 'Something went wrong generating sentences.' }, 500)
    }
})