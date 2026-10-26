// File: scripts/word-images/migrate-phrase-keys.ts
// Phrases used to be stored with their spaces removed ("washingmachine",
// "kapatidnalalaki"), so a pupil tapping one word of the phrase never matched.
// The coach now looks phrases up with single spaces between the words, so this
// puts a spaced key next to them ("washing machine"). Pictures, credits and
// reviewed flags are kept as they are.
//
//  - English phrases come from every English word with a space in the word-list
//    CSVs in this folder.
//  - Filipino phrases are the list below: Filipino text writes these as separate
//    words, unlike real hyphenated words (mag-aral, lumba-lumba, bahay-kubo)
//    which stay one word.
//
// English phrases are COPIED: many are also real single words ("hotdog",
// "lunchbox", "firetruck"), so the joined key stays. Filipino phrases are
// RENAMED, because they are never written joined. Safe to re-run.
//
//   npx tsx scripts/word-images/migrate-phrase-keys.ts [--dry-run]
//   $env:ENV_FILE=".env.cloud.local"; npx tsx scripts/word-images/migrate-phrase-keys.ts
import { readdirSync, readFileSync } from 'node:fs'
import { supabase } from '../client.ts'

const FILIPINO_PHRASES = [
    'kapatid na lalaki',
    'kapatid na babae',
    'anak na lalaki',
    'anak na babae',
    'batang lalaki',
    'batang babae',
    'mga tao',
    'inahing manok',
    'katawan ng puno',
    'magluto sa hurno',
    'daliri sa paa',
    'salamin sa mata',
    'may sakit',
    'walang laman',
    'hindi totoo',
    'sa harap',
    'sa loob',
    'sa labas',
    'sa likod',
    'sa itaas',
    'sa ibaba',
    'sa pagitan',
]

const normalize = (word: string) => word.toLowerCase().replace(/[^\p{L}\p{N}']/gu, '').replace(/'/g, '').trim()
const normalizeKey = (text: string) => text.split(/\s+/).map(normalize).filter(Boolean).join(' ')

function englishPhrasesFromCsvs(): string[] {
    const phrases = new Set<string>()
    for (const file of readdirSync('scripts/word-images').filter((f) => f.endsWith('.csv') && !f.includes('.missing.'))) {
        const lines = readFileSync(`scripts/word-images/${file}`, 'utf8').split(/\r?\n/).slice(1)
        for (const line of lines) {
            const english = (line.split(',')[0] ?? '').trim().replace(/^~/, '')
            if (/\s/.test(english)) phrases.add(normalizeKey(english))
        }
    }
    return [...phrases]
}

async function migrate(language: 'en' | 'fil', phrase: string, dryRun: boolean): Promise<string | null> {
    const joined = phrase.replace(/ /g, '')
    const { data: rows, error } = await supabase
        .from('word_images')
        .select('id, sense, image_path, source, credit, source_url, reviewed, reviewed_at, cues')
        .eq('language', language)
        .eq('word', joined)
    if (error) throw error
    if (!rows || rows.length === 0) return null
    let moved = 0
    for (const row of rows) {
        const { data: clash } = await supabase
            .from('word_images')
            .select('id')
            .eq('language', language)
            .eq('word', phrase)
            .eq('sense', row.sense)
            .maybeSingle()
        if (dryRun) {
            moved++
            continue
        }
        if (clash && language === 'en') continue
        const { id, ...copy } = row
        const { error: writeError = null } =
            language === 'en'
                ? await supabase.from('word_images').insert({ ...copy, language, word: phrase })
                : clash
                  ? await supabase.from('word_images').delete().eq('id', id)
                  : await supabase.from('word_images').update({ word: phrase }).eq('id', id)
        if (writeError) throw writeError
        moved++
    }
    if (moved === 0) return null
    return `${language}: "${joined}" -> "${phrase}"${moved > 1 ? ` (${moved} rows)` : ''}`
}

async function main() {
    const dryRun = process.argv.includes('--dry-run')
    console.log(`${dryRun ? 'DRY RUN on' : 'Migrating phrase keys on'} ${process.env.VITE_SUPABASE_URL}`)
    let count = 0
    for (const phrase of englishPhrasesFromCsvs()) {
        const done = await migrate('en', phrase, dryRun)
        if (done) {
            console.log(`  ${done}`)
            count++
        }
    }
    for (const phrase of FILIPINO_PHRASES) {
        const done = await migrate('fil', phrase, dryRun)
        if (done) {
            console.log(`  ${done}`)
            count++
        }
    }
    console.log(`\n${dryRun ? 'Would migrate' : 'Migrated'} ${count} phrase key(s).`)
}

main().catch((err) => {
    console.error(err instanceof Error ? err.message : err)
    process.exit(1)
})
