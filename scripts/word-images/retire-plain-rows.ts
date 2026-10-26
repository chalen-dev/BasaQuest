// File: scripts/word-images/retire-plain-rows.ts
// After a senses CSV has been imported, removes the OLD unnamed row of every
// word it covers. A word with named meanings ("top": spinning toy, bottle cap,
// ...) must not also keep its old single picture, or that one would stay the
// answer for every sentence. A word is only touched when at least one named
// meaning row exists for it, and a picture file is only deleted once nothing
// else uses it.
//
//   npx tsx scripts/word-images/retire-plain-rows.ts scripts/word-images/words-senses-en.csv [more.csv ...] [--dry-run]
//   $env:ENV_FILE=".env.cloud.local"; npx tsx scripts/word-images/retire-plain-rows.ts <csv>
import { readFileSync } from 'node:fs'
import { supabase } from '../client.ts'

const BUCKET = 'word-images'

// Same rules as import-word-images.ts.
const normalize = (word: string) => word.toLowerCase().replace(/[^\p{L}\p{N}']/gu, '').replace(/'/g, '').trim()
const normalizeKey = (text: string) => text.split(/\s+/).map(normalize).filter(Boolean).join(' ')
const splitKeys = (cell: string) => [...new Set(cell.split(';').map(normalizeKey).filter(Boolean))]

function keysFromCsv(path: string) {
    const keys = { en: new Set<string>(), fil: new Set<string>() }
    const lines = readFileSync(path, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    for (const [i, line] of lines.entries()) {
        const [english = '', filipino = '', forms = '', sense = ''] = line.split(',').map((c) => c.trim())
        if (i === 0 && english.toLowerCase() === 'english_word') continue
        if (!english || !sense) continue
        if (!english.startsWith('~')) keys.en.add(normalizeKey(english))
        for (const k of splitKeys(forms)) keys.en.add(k)
        for (const k of splitKeys(filipino)) keys.fil.add(k)
    }
    return keys
}

async function main() {
    const args = process.argv.slice(2)
    const dryRun = args.includes('--dry-run')
    const files = args.filter((a) => !a.startsWith('--'))
    if (files.length === 0) throw new Error('Usage: retire-plain-rows.ts <senses.csv> [more.csv ...] [--dry-run]')

    console.log(`${dryRun ? 'DRY RUN on' : 'Retiring plain rows on'} ${process.env.VITE_SUPABASE_URL}`)
    const filesToCheck = new Set<string>()
    let retired = 0
    for (const file of files) {
        const keys = keysFromCsv(file)
        for (const language of ['en', 'fil'] as const) {
            for (const word of keys[language]) {
                const { data: rows, error } = await supabase
                    .from('word_images')
                    .select('id, sense, image_path')
                    .eq('language', language)
                    .eq('word', word)
                if (error) throw error
                const plain = (rows ?? []).filter((r) => r.sense === '')
                const named = (rows ?? []).filter((r) => r.sense !== '')
                if (plain.length === 0 || named.length === 0) continue
                for (const row of plain) {
                    if (!dryRun) {
                        const { error: deleteError } = await supabase.from('word_images').delete().eq('id', row.id)
                        if (deleteError) throw deleteError
                    }
                    filesToCheck.add(row.image_path)
                    retired++
                    console.log(`  - ${language}:${word} (was ${row.image_path}, now ${named.length} named meaning(s))`)
                }
            }
        }
    }

    // Delete a picture file only when no row points at it any more.
    for (const path of filesToCheck) {
        const { count, error } = await supabase
            .from('word_images')
            .select('id', { count: 'exact', head: true })
            .eq('image_path', path)
        if (error) throw error
        if ((count ?? 0) > 0) continue
        console.log(`  x ${path}: no longer used${dryRun ? '' : ', removed'}`)
        if (!dryRun) await supabase.storage.from(BUCKET).remove([path])
    }
    console.log(`\n${dryRun ? 'Would retire' : 'Retired'} ${retired} plain row(s).`)
}

main().catch((err) => {
    console.error(err instanceof Error ? err.message : err)
    process.exit(1)
})
