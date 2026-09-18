// File: supabase/functions/generate-remediation-passages/index.ts
// Generates a SET of short, natural multi-word passages from a pupil's
// weak-word list, for Reading Coach Mode's passage-based rebuild —
// replaces generate-remediation-sentences' one-isolated-sentence-per-
// word approach with passages that read naturally, where each
// individual passage only needs to cover whichever subset of words fits
// it, but every word in the input list must appear as a highlighted
// target SOMEWHERE across the whole returned set. Modeled directly on
// generate-passage/index.ts's Gemini-calling pattern (same model,
// same server-side-only API key, same JSON-schema response), but
// batched like generate-remediation-sentences: ONE Gemini call handles
// the whole word list and returns every passage at once, so Gemini can
// see the full list and group it sensibly instead of being handed
// arbitrary pre-sliced chunks.
//
// Called once per generation attempt, from the new remediation-material
// preview screen (reached from "Generate Remediation Material" on
// AttemptResults.tsx) — never on the fly during Coach Mode itself. That
// screen also supports regenerating a single passage; a "regenerate
// just this one" call reuses this same function with that passage's own
// original targetWords as the whole word list (so it naturally still
// only produces one passage, and its own target coverage is unchanged).
//
// TRUNCATION HAPPENS ON THE CALLER'S SIDE, NOT HERE: MAX_WORDS_PER_REQUEST
// below is a safety-net matching generate-remediation-sentences' own
// 400 response if exceeded — the actual "which 60 words if the list is
// longer" decision (sorted by each word's `count`, most-missed first)
// needs each word's occurrence count, which this function is never
// given (it only ever sees bare word strings) and has no principled way
// to guess at, so that trimming belongs to the caller, which already
// has RemediationWordEntry.count available.
//
// COVERAGE IS ALSO A CALLER-SIDE CONCERN: this function's own
// isValidPassageList() below only checks that what Gemini returned is
// STRUCTURALLY valid (well-formed passages) — same shallow-validation
// precedent generate-remediation-sentences already sets (it never
// checks "did every input word get a result" either). Reconciling
// "did every input word actually end up as a target somewhere" against
// the response is the preview screen's job, the same way
// AttemptResults.tsx's attachSentences() already reconciles
// generate-remediation-sentences' per-word results against the input
// list rather than trusting Gemini's coverage claim blindly.
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const MODEL = 'gemini-3.5-flash-lite'
const MAX_WORDS_PER_REQUEST = 60
// How many weak words a single passage is expected to comfortably carry
// as targets, and a hard ceiling on how many passages one generation
// event produces — both just a SUGGESTED target passed to Gemini (see
// buildPrompt below), not a hard requirement, since natural grouping
// sometimes calls for a slightly different count either way.
const TARGET_WORDS_PER_PASSAGE = 5
const MAX_PASSAGES = 8
type GradeSpec = { minWords: number; maxWords: number; note: string }
// A short remediation PASSAGE (2-4 sentences) needs a much shorter
// word-count range per grade than generate-passage's own gradeSpec() —
// that table is sized for one whole oral-fluency check-in passage
// (30-240 words). These ranges are roughly 40-50% of that table's,
// reusing its complexity-language style at each grade.
function gradeSpec(grade: number): GradeSpec {
    const g = Math.min(6, Math.max(1, Math.round(grade)))
    const table: Record<number, GradeSpec> = {
        1: { minWords: 15, maxWords: 25, note: 'very short, simple sentences (3-6 words), common sight words, mostly one- and two-syllable words, easy to sound out aloud' },
        2: { minWords: 20, maxWords: 35, note: 'short sentences (5-8 words), simple past/present tense, familiar everyday words, comfortable to read aloud' },
        3: { minWords: 25, maxWords: 45, note: 'sentences of moderate length, a few three-syllable words, school or community settings' },
        4: { minWords: 35, maxWords: 55, note: 'varied sentence structure, some descriptive vocabulary, still natural to read aloud without tongue-twisters' },
        5: { minWords: 45, maxWords: 65, note: 'longer sentences, some multi-syllabic vocabulary, a narrative with a clear problem and resolution' },
        6: { minWords: 55, maxWords: 75, note: 'longer paragraphs, richer vocabulary, age-appropriate figurative language' },
    }
    return table[g]
}
function buildPrompt(words: string[], lang: 'fil' | 'en', gradeLevel: number): string {
    const g = Math.min(6, Math.max(1, Math.round(gradeLevel)))
    const spec = gradeSpec(g)
    const language = lang === 'fil' ? 'Filipino (Tagalog)' : 'English'
    const targetPassageCount = Math.min(MAX_PASSAGES, Math.max(1, Math.round(words.length / TARGET_WORDS_PER_PASSAGE)))
    return `You are writing short reading-practice passages for a Filipino elementary school pupil in Grade ${g}, so they can practice specific words they struggle with by reading them in natural context, plus a quick coaching tip for each passage.

Group the following weak words into about ${targetPassageCount} natural passages. A passage does NOT need to use every word in the list — just group together whichever words read naturally together in one passage. But every single word in the list MUST end up as a target word in at least one passage somewhere across the full set you return — never leave a word out entirely.

Words to cover: ${JSON.stringify(words)}

For EACH passage, produce:
1. A short passage in ${language}, ${spec.minWords}-${spec.maxWords} words, ${spec.note}, naturally weaving in as many of the words you assigned to it as read comfortably — then split that passage into its individual word tokens in reading order (punctuation can stay attached to its word, e.g. "bahay." is one token).
2. "targetWords": exactly which of the input words this specific passage is practicing, in their exact given form.
3. "targetIndices": the 0-based position within THIS passage's word tokens of EVERY occurrence of every one of its target words — if a target word appears more than once in the passage, mark every occurrence, not just the first.
4. "coachTip": one short, warm coaching tip (roughly 10-25 words) addressed directly to the pupil, about the target words in THIS passage collectively — e.g. a sound they share, how to sound one out, something to listen for. Never generic ("do your best") — it must reference something real about the actual target words.

Requirements:
- Content: warm, wholesome, everyday, culturally familiar to a Filipino child (home, school, barangay, nature, family, friendship) — never scary, violent, or sad.
- Plain, natural spoken rhythm — a child that age should be able to read each passage aloud comfortably. Never force an unnatural sentence just to cram in vocabulary.
- Every word in the input list must appear as a target word in at least one passage you return.
- Return ONLY the JSON array matching the response schema. No text outside the JSON.`
}
const RESPONSE_SCHEMA = {
    type: 'ARRAY',
    items: {
        type: 'OBJECT',
        properties: {
            passageWords: { type: 'ARRAY', items: { type: 'STRING' }, description: 'The passage split into individual word tokens, in reading order.' },
            targetWords: { type: 'ARRAY', items: { type: 'STRING' }, description: 'The input words this passage targets, in their exact given form.' },
            targetIndices: { type: 'ARRAY', items: { type: 'INTEGER' }, description: 'Every 0-based position within passageWords that is an occurrence of one of targetWords.' },
            coachTip: { type: 'STRING', description: 'A short reading-coach tip about this passage\'s target words, addressed to the pupil.' },
        },
        required: ['passageWords', 'targetWords', 'targetIndices', 'coachTip'],
    },
} as const
function jsonResponse(body: unknown, status: number) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
    })
}
type PassageItem = { passageWords: string[]; targetWords: string[]; targetIndices: number[]; coachTip: string }
function isValidPassageList(input: unknown): input is PassageItem[] {
    if (!Array.isArray(input) || input.length === 0) return false
    return input.every((item) => {
        if (!item || typeof item !== 'object') return false
        const a = item as Record<string, unknown>
        if (
            !Array.isArray(a.passageWords) ||
            a.passageWords.length === 0 ||
            !a.passageWords.every((w) => typeof w === 'string' && w.trim().length > 0)
        ) return false
        if (
            !Array.isArray(a.targetWords) ||
            a.targetWords.length === 0 ||
            !a.targetWords.every((w) => typeof w === 'string' && w.trim().length > 0)
        ) return false
        const wordCount = (a.passageWords as string[]).length
        if (
            !Array.isArray(a.targetIndices) ||
            a.targetIndices.length === 0 ||
            !a.targetIndices.every((i) => Number.isInteger(i) && i >= 0 && i < wordCount)
        ) return false
        return typeof a.coachTip === 'string' && a.coachTip.trim().length > 0
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
            console.error('generate-remediation-passages: GEMINI_API_KEY is not set')
            return jsonResponse({ error: 'Server is not configured for passage generation yet.' }, 500)
        }
        const body = await req.json().catch(() => null)
        const words = Array.isArray(body?.words) ? body.words.filter((w: unknown) => typeof w === 'string' && w.trim().length > 0) : null
        const lang = body?.language === 'en' ? 'en' : body?.language === 'fil' ? 'fil' : null
        const gradeLevel = Number(body?.gradeLevel)
        if (!words || words.length === 0 || !lang || !Number.isFinite(gradeLevel) || gradeLevel < 1 || gradeLevel > 6) {
            return jsonResponse({ error: 'Expected { words: string[], language: "fil" | "en", gradeLevel: 1-6 } in the request body.' }, 400)
        }
        if (words.length > MAX_WORDS_PER_REQUEST) {
            return jsonResponse({ error: `Too many words in one request (max ${MAX_WORDS_PER_REQUEST}).` }, 400)
        }
        const targetPassageCount = Math.min(MAX_PASSAGES, Math.max(1, Math.round(words.length / TARGET_WORDS_PER_PASSAGE)))
        const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: buildPrompt(words, lang, gradeLevel) }] }],
                    generationConfig: {
                        responseMimeType: 'application/json',
                        responseSchema: RESPONSE_SCHEMA,
                        temperature: 0.8,
                        maxOutputTokens: 550 * targetPassageCount + 300,
                    },
                }),
            },
        )
        if (!geminiRes.ok) {
            const detail = await geminiRes.text()
            console.error('generate-remediation-passages: Gemini API error', geminiRes.status, detail)
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
        if (!isValidPassageList(parsed)) {
            console.error('generate-remediation-passages: malformed Gemini payload', JSON.stringify(geminiData))
            return jsonResponse({ error: 'Got an unexpected response while generating passages. Please try again.' }, 502)
        }
        return jsonResponse(parsed, 200)
    } catch (err) {
        console.error('generate-remediation-passages: unexpected error', err)
        return jsonResponse({ error: 'Something went wrong generating passages.' }, 500)
    }
})
