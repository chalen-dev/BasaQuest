// File: supabase/functions/generate-passage/index.ts
// Generates a grade-appropriate passage for a pupil to read ALOUD during an
// oral reading fluency (ORF) check-in — pronunciation/fluency is scored
// downstream (Azure Pronunciation Assessment for English, Deepgram + GOP for
// Filipino), so this only needs to return passage text, not comprehension
// questions. Uses the Gemini API free tier — the API key lives only in this
// server-side secret (supabase/.env locally, `supabase secrets set` in
// production) and never reaches the browser bundle. Called from the client
// via supabase.functions.invoke('generate-passage', { body: { gradeLevel, lang } }).
// Requires the caller to be an authenticated user (default verify_jwt = true).

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MODEL = 'gemini-3.5-flash-lite'

type GradeSpec = { minWords: number; maxWords: number; note: string }

function gradeSpec(grade: number): GradeSpec {
    const g = Math.min(6, Math.max(1, Math.round(grade)))
    const table: Record<number, GradeSpec> = {
        1: { minWords: 30, maxWords: 50, note: 'very short, simple sentences (3-6 words), common sight words, mostly one- and two-syllable words, easy to sound out aloud' },
        2: { minWords: 50, maxWords: 80, note: 'short sentences (5-8 words), simple past/present tense, familiar everyday words, comfortable to read aloud' },
        3: { minWords: 80, maxWords: 120, note: 'sentences of moderate length (7-12 words each), a few three-syllable words, school or community settings' },
        4: { minWords: 120, maxWords: 160, note: 'varied sentence structure with most sentences 8-14 words and none over 18, some descriptive vocabulary, still natural to read aloud without tongue-twisters' },
        5: { minWords: 160, maxWords: 200, note: 'longer sentences (10-16 words each), some multi-syllabic vocabulary, a narrative with a clear problem and resolution' },
        6: { minWords: 200, maxWords: 240, note: 'longer paragraphs with sentences of 12-18 words, richer vocabulary, age-appropriate figurative language' },
    }
    return table[g]
}

// The teacher can ask for a difficulty from 1 (easy) to 5 (difficult) before
// generating. It steers sentence and word length; the grade still sets the
// passage length and topics. The app rates the result with the same idea
// (src/lib/passageDifficulty.ts), so these lengths line up with its stars.
const DIFFICULTY_NOTE: Record<number, string> = {
    1: 'very easy: sentences of 3-6 words, only very common one- and two-syllable words',
    2: 'easy: sentences of 6-9 words, familiar everyday words',
    3: 'medium: sentences of 8-13 words, mostly familiar words with a few longer ones',
    4: 'challenging: sentences of 11-17 words, descriptive and some multi-syllable words',
    5: 'difficult: sentences of 15-22 words, rich vocabulary and varied sentence structure',
}

function buildPrompt(gradeLevel: number, lang: 'fil' | 'en', difficulty: number | null) {
    const g = Math.min(6, Math.max(1, Math.round(gradeLevel)))
    const spec = gradeSpec(g)
    const language = lang === 'fil' ? 'Filipino (Tagalog)' : 'English'
    const difficultyLine = difficulty
        ? `\n- Difficulty: ${difficulty} out of 5 (${DIFFICULTY_NOTE[difficulty]}). Where this differs from the reading level above, follow this difficulty for sentence and word length; keep the passage length and topic requirements.`
        : ''

    return `You are writing an oral reading passage for a Filipino elementary school pupil in Grade ${g}, for a one-on-one reading fluency check-in where the pupil reads the passage ALOUD to a teacher. This is NOT a comprehension quiz — only the passage itself is needed.

Write the passage in ${language}. Requirements:
- Length: ${spec.minWords}-${spec.maxWords} words.
- Reading level: ${spec.note}.${difficultyLine}
- Content: warm, wholesome, culturally familiar to a Filipino child (home, barangay, school, sari-sari store, palengke, fiesta, nature, friendship, family) — never scary, violent, or sad.
- Write in plain prose, natural spoken rhythm — avoid tongue-twisters, unusual proper names, or words a child that age wouldn't know how to pronounce.
- Language: write ONLY in ${language}, in both the title and the passage. Do not mix in words from any other language${lang === 'fil' ? ' (no English words such as "school", "mother" or "happy"; use the Filipino word instead)' : ' (no Filipino or Tagalog words such as "nanay", "bahay" or "po")'}. Proper names of people and places are the only exception.
- Give the passage a short, friendly title.

Return ONLY the JSON object matching the response schema. No text outside the JSON.`
}

const RESPONSE_SCHEMA = {
    type: 'OBJECT',
    properties: {
        title: { type: 'STRING', description: 'Short, friendly title for the passage.' },
        passage: { type: 'STRING', description: 'The full passage text, plain prose, no markdown.' },
    },
    required: ['title', 'passage'],
} as const

function jsonResponse(body: unknown, status: number) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
}

function isValidPassage(input: unknown): input is { title: string; passage: string } {
    if (!input || typeof input !== 'object') return false
    const a = input as Record<string, unknown>
    return typeof a.title === 'string' && a.title.trim().length > 0 && typeof a.passage === 'string' && a.passage.trim().length > 0
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
            console.error('generate-passage: GEMINI_API_KEY is not set')
            return jsonResponse({ error: 'Server is not configured for passage generation yet.' }, 500)
        }

        const body = await req.json().catch(() => null)
        const gradeLevel = Number(body?.gradeLevel)
        const lang = body?.lang === 'en' ? 'en' : body?.lang === 'fil' ? 'fil' : null
        // Optional: left out for a pupil's own session, where nobody picks one.
        const rawDifficulty = body?.difficulty
        const difficulty = Number.isInteger(rawDifficulty) && rawDifficulty >= 1 && rawDifficulty <= 5 ? (rawDifficulty as number) : null

        if (!Number.isFinite(gradeLevel) || gradeLevel < 1 || gradeLevel > 6 || !lang) {
            return jsonResponse({ error: 'Expected { gradeLevel: 1-6, lang: "fil" | "en", difficulty?: 1-5 } in the request body.' }, 400)
        }

        const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: buildPrompt(gradeLevel, lang, difficulty) }] }],
                    generationConfig: {
                        responseMimeType: 'application/json',
                        responseSchema: RESPONSE_SCHEMA,
                        temperature: 0.9,
                        maxOutputTokens: 800,
                    },
                }),
            },
        )

        if (!geminiRes.ok) {
            const detail = await geminiRes.text()
            console.error('generate-passage: Gemini API error', geminiRes.status, detail)
            return jsonResponse({ error: 'The passage generator is temporarily unavailable. Please try again.' }, 502)
        }

        const geminiData = await geminiRes.json()
        const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text

        let parsed: unknown
        try {
            parsed = typeof rawText === 'string' ? JSON.parse(rawText) : null
        } catch {
            parsed = null
        }

        if (!isValidPassage(parsed)) {
            console.error('generate-passage: malformed Gemini payload', JSON.stringify(geminiData))
            return jsonResponse({ error: 'Got an unexpected response while generating the passage. Please try again.' }, 502)
        }

        return jsonResponse(parsed, 200)
    } catch (err) {
        console.error('generate-passage: unexpected error', err)
        return jsonResponse({ error: 'Something went wrong generating the passage.' }, 500)
    }
})