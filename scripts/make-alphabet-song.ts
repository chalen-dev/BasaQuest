// scripts/make-alphabet-song.ts
//
// Makes the alphabet song for Letters & Sounds with the ElevenLabs Music API (a paid feature).
// One chunk per letter ("A is for apple, ah, ah, apple"), every chunk the same length, so the
// start time of each letter is known exactly and the scene can light up the right tab while it plays.
//
//   Preview the plan without calling the API (free, no key needed):
//     node --experimental-strip-types --no-warnings scripts/make-alphabet-song.ts --lang en --dry-run
//
//   Make the song (put your key in an environment variable, never in a file):
//     PowerShell:  $env:ELEVENLABS_API_KEY = "<your key>"
//                  node --experimental-strip-types --no-warnings scripts/make-alphabet-song.ts --lang en
//
// It writes public/songs/alphabet-<lang>.mp3 and public/songs/alphabet-<lang>.json (the timings).
// The words sung are the SONG words: the built-in main word of each letter, not a teacher's pick.
import fs from 'node:fs'
import path from 'node:path'
import { EN_LEVEL_1 } from '../src/pages/proficiency/foundational/data/en/level1.ts'
import { FIL_LEVEL_1 } from '../src/pages/proficiency/foundational/data/fil/level1.ts'

type Lang = 'en' | 'fil'

const args = process.argv.slice(2)
const flag = (name: string) => args.includes(`--${name}`)
const value = (name: string) => {
    const at = args.indexOf(`--${name}`)
    return at >= 0 ? args[at + 1] : undefined
}
const lang = (value('lang') ?? 'en') as Lang
if (lang !== 'en' && lang !== 'fil') throw new Error('--lang must be en or fil')

// 100 BPM: one beat is 600 ms. Every letter gets 8 beats (4.8 s), the intro and the outro too.
const CHUNK_MS = 4800

// How each letter's sound is written so the singer says it right ("buh", not "bee").
const SOUND: Record<Lang, Record<string, string>> = {
    en: {
        a: 'ah', b: 'buh', c: 'kuh', d: 'duh', e: 'eh', f: 'fff', g: 'guh', h: 'huh', i: 'ih', j: 'juh', k: 'kuh', l: 'lll', m: 'mmm',
        n: 'nnn', o: 'o', p: 'puh', q: 'kwuh', r: 'rrr', s: 'sss', t: 'tuh', u: 'uh', v: 'vvv', w: 'wuh', x: 'ks', y: 'yuh', z: 'zzz',
    },
    fil: {
        a: 'a', b: 'buh', c: 'kuh', d: 'duh', e: 'eh', f: 'fff', g: 'guh', h: 'huh', i: 'ih', j: 'juh', k: 'kuh', l: 'lll', m: 'mmm',
        n: 'nnn', 'ñ': 'nya', ng: 'nga', o: 'o', p: 'puh', q: 'kuh', r: 'rrr', s: 'sss', t: 'tuh', u: 'u', v: 'vvv', w: 'wuh', x: 'ks', y: 'yuh', z: 'zzz',
    },
}

const level = lang === 'en' ? EN_LEVEL_1 : FIL_LEVEL_1
const intro = lang === 'en' ? "Come and sing with me, let's sing the alphabet!" : "Halina't kumanta, awitin ang alpabeto!"
const outro = lang === 'en' ? 'Now you know your ABCs, what a super you!' : 'Kilala mo na ang alpabeto, ang galing mo!'

const line = (upper: string, lower: string, word: string) => {
    const sound = SOUND[lang][lower] ?? lower
    if (lang === 'en') return `${upper} is for ${word}, ${sound}, ${sound}, ${word}`
    // Ñ is taught from inside its word (piña), so it says "nasa", like the scene.
    return `${upper} ${lower === 'ñ' ? 'nasa' : 'para sa'} ${word}, ${sound}, ${sound}, ${word}`
}

const STYLES = [
    "cheerful children's nursery song",
    'simple bouncy melody',
    '100 BPM',
    'C major',
    'one clear friendly female voice',
    'ukulele and hand claps',
    'very clear pronunciation',
]
const NEGATIVE = ['dark', 'distorted', 'heavy drums', 'whispering', 'rap']

// The English data lists letters in teaching order (s a t i ...); the song goes A to Z. Filipino is already in order.
const alphabetical = <T extends { lower: string }>(list: T[]): T[] => (lang === 'en' ? [...list].sort((x, y) => x.lower.localeCompare(y.lower)) : list)

type Entry = { kind: 'intro' | 'letter' | 'outro'; letter?: string; word?: string; text: string }
const entries: Entry[] = [
    { kind: 'intro', text: intro },
    ...alphabetical(level.letters ?? []).map((l) => ({ kind: 'letter' as const, letter: l.lower, word: l.word, text: line(l.upper, l.lower, l.word) })),
    { kind: 'outro', text: outro },
]
if (entries.length > 30) throw new Error(`A plan may have at most 30 chunks, this one has ${entries.length}`)

const sectionName = (e: Entry) => (e.kind === 'letter' ? `Letter ${e.letter!.toUpperCase()}` : e.kind === 'intro' ? 'Intro' : 'Outro')
const plan = {
    chunks: entries.map((e) => ({
        text: `[${sectionName(e)}]\n${e.text}`,
        duration_ms: CHUNK_MS,
        positive_styles: STYLES,
        negative_styles: NEGATIVE,
        context_adherence: 'high',
    })),
}
const manifest = {
    lang,
    model: 'music_v2_5',
    chunkMs: CHUNK_MS,
    durationMs: entries.length * CHUNK_MS,
    lines: entries.map((e, i) => ({ kind: e.kind, letter: e.letter ?? null, word: e.word ?? null, text: e.text, startMs: i * CHUNK_MS, endMs: (i + 1) * CHUNK_MS })),
}

if (flag('dry-run')) {
    console.log(`${entries.length} chunks, ${(manifest.durationMs / 1000).toFixed(1)} s in total\n`)
    for (const e of entries) console.log(`${sectionName(e).padEnd(10)} ${e.text}`)
    process.exit(0)
}

const key = process.env.ELEVENLABS_API_KEY
if (!key) {
    console.error('Set ELEVENLABS_API_KEY first (see the top of this file). Nothing was sent.')
    process.exit(1)
}

const outDir = path.resolve('public/songs')
fs.mkdirSync(outDir, { recursive: true })
console.log(`Asking ElevenLabs for a ${(manifest.durationMs / 1000).toFixed(0)} s song (${lang})… this can take a minute or two.`)
const seed = value('seed')
const response = await fetch('https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128', {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model_id: 'music_v2_5', composition_plan: plan, ...(seed ? { seed: Number(seed) } : {}) }),
})
if (!response.ok) {
    console.error(`ElevenLabs answered ${response.status}: ${(await response.text()).slice(0, 600)}`)
    process.exit(1)
}
const audio = Buffer.from(await response.arrayBuffer())
fs.writeFileSync(path.join(outDir, `alphabet-${lang}.mp3`), audio)
fs.writeFileSync(path.join(outDir, `alphabet-${lang}.json`), JSON.stringify(manifest, null, 2))
console.log(`Saved public/songs/alphabet-${lang}.mp3 (${(audio.length / 1024).toFixed(0)} KB) and alphabet-${lang}.json. Listen to it before using it.`)
