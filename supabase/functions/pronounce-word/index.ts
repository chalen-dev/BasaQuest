// File: supabase/functions/pronounce-word/index.ts
//
// Generates (and caches) a spoken-word audio clip via Azure's neural
// Text-to-Speech, reusing the SAME Azure Speech resource/credentials
// (AZURE_SPEECH_KEY / AZURE_SPEECH_REGION) the separate basaquest-scoring
// service already uses for Pronunciation Assessment — see azureAssess.js
// there. Different Azure endpoint (TTS REST, not the Speech SDK's
// assessment flow), same account, same key.
//
// Replaces the earlier browser text-to-speech approach in
// RemediationSession.tsx — quality/voice-availability was inconsistent
// across devices, which isn't acceptable for a feature whose entire job
// is teaching correct pronunciation. Real neural voices
// (en-US-JennyNeural / fil-PH-BlessicaNeural) are consistent regardless
// of what device/browser the teacher is on.
//
// CACHING: the same flagged word gets requested repeatedly across many
// pupils/attempts, so every generated clip is cached forever in the
// public "pronunciation-audio" Storage bucket (see its own migration)
// under "<language>/<slug>.mp3". A cache hit skips Azure entirely — no
// repeat cost, no repeat latency. Cache existence is checked via a
// Storage list() call (not a try/catch download, since a public bucket
// URL construction never itself errors) before ever calling Azure.
//
// Called from the client via
// supabase.functions.invoke('pronounce-word', { body: { word, language } }).
// Requires the caller to be authenticated (default verify_jwt = true) —
// same as generate-passage.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BUCKET = 'pronunciation-audio'

const VOICE_BY_LANGUAGE: Record<'en' | 'fil', string> = {
    en: 'en-US-JennyNeural',
    fil: 'fil-PH-BlessicaNeural',
}
const LOCALE_BY_LANGUAGE: Record<'en' | 'fil', string> = {
    en: 'en-US',
    fil: 'fil-PH',
}

// Same normalization family as align.js's normalize() (strip everything
// but letters/numbers/apostrophes, lowercase) — plus stripping the
// apostrophe too, purely so the cache filename itself stays simple
// (no URL-encoding concerns), since the apostrophe never mattered for
// how the word sounds anyway.
function slugify(word: string): string {
    return word
        .toLowerCase()
        .replace(/[^\p{L}\p{N}']/gu, '')
        .replace(/'/g, '')
        .trim()
}

function escapeXml(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
}

async function getAzureToken(key: string, region: string): Promise<string> {
    const res = await fetch(`https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`, {
        method: 'POST',
        headers: { 'Ocp-Apim-Subscription-Key': key },
    })
    if (!res.ok) {
        throw new Error(`Azure token request failed (${res.status})`)
    }
    return await res.text()
}

async function synthesize(word: string, lang: 'en' | 'fil', key: string, region: string): Promise<Uint8Array> {
    const token = await getAzureToken(key, region)
    const voice = VOICE_BY_LANGUAGE[lang]
    const locale = LOCALE_BY_LANGUAGE[lang]
    const ssml = `<speak version='1.0' xml:lang='${locale}'><voice name='${voice}'>${escapeXml(word)}</voice></speak>`
    const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/ssml+xml',
            'X-Microsoft-OutputFormat': 'audio-16khz-64kbitrate-mono-mp3',
            'User-Agent': 'basaquest-pronounce-word',
        },
        body: ssml,
    })
    if (!res.ok) {
        const detail = await res.text().catch(() => '')
        throw new Error(`Azure TTS request failed (${res.status}): ${detail}`)
    }
    return new Uint8Array(await res.arrayBuffer())
}

function jsonResponse(body: unknown, status: number) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, 'content-type': 'application/json' },
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
        const azureKey = Deno.env.get('AZURE_SPEECH_KEY')
        const azureRegion = Deno.env.get('AZURE_SPEECH_REGION')
        if (!azureKey || !azureRegion) {
            console.error('pronounce-word: AZURE_SPEECH_KEY / AZURE_SPEECH_REGION is not set')
            return jsonResponse({ error: 'Server is not configured for pronunciation audio yet.' }, 500)
        }
        const body = await req.json().catch(() => null)
        const rawWord = typeof body?.word === 'string' ? body.word : ''
        const lang = body?.language === 'fil' ? 'fil' : body?.language === 'en' ? 'en' : null
        const slug = slugify(rawWord)
        if (!slug || !lang) {
            return jsonResponse({ error: 'Expected { word: string, language: "en" | "fil" } in the request body.' }, 400)
        }
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const adminClient = createClient(supabaseUrl, serviceRoleKey)
        const filename = `${slug}.mp3`
        const storagePath = `${lang}/${filename}`
        const { data: existingFiles } = await adminClient.storage.from(BUCKET).list(lang, { search: filename })
        const alreadyCached = (existingFiles ?? []).some((f) => f.name === filename)
        if (!alreadyCached) {
            let audioBytes: Uint8Array
            try {
                audioBytes = await synthesize(slug, lang, azureKey, azureRegion)
            } catch (err) {
                console.error('pronounce-word: Azure TTS failed', err)
                return jsonResponse({ error: 'The pronunciation service is temporarily unavailable. Please try again.' }, 502)
            }
            const { error: uploadError } = await adminClient.storage.from(BUCKET).upload(storagePath, audioBytes, {
                contentType: 'audio/mpeg',
                upsert: true,
            })
            if (uploadError) {
                console.error('pronounce-word: failed to cache generated audio', uploadError)
                return jsonResponse({ error: 'Failed to save generated audio.' }, 500)
            }
        }
        const { data: publicUrlData } = adminClient.storage.from(BUCKET).getPublicUrl(storagePath)
        return jsonResponse({ url: publicUrlData.publicUrl, cached: alreadyCached }, 200)
    } catch (err) {
        console.error('pronounce-word: unexpected error', err)
        return jsonResponse({ error: err instanceof Error ? err.message : 'Something went wrong generating pronunciation audio.' }, 500)
    }
})