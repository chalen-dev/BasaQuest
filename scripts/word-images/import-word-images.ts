// File: scripts/word-images/import-word-images.ts
// Fills the word_images table + word-images bucket from a CSV word list.
//
//   npm run word-images:import -- scripts/word-images/sample-words.csv [--dry-run] [--limit 20] [--force]
//
// CSV columns: english_word,filipino_word  (filipino_word may be blank for
// English-only rows). Pictures are found by the ENGLISH meaning — no open
// image bank is indexed by Filipino — then stored against both words, so
// "mango" and "mangga" share one file. Order of sources: ARASAAC first
// (consistent pictogram style), OpenMoji as the fallback. Words neither
// finds are written to <csv>.missing.csv for manual upload / Wikimedia.
//
// Idempotent: a word that already has a row is skipped unless --force.
// Uses the service-role client (scripts/client.ts), which bypasses RLS.
import { readFileSync, writeFileSync } from 'node:fs'
import { supabase } from '../client.ts'

const BUCKET = 'word-images'
const ARASAAC_CREDIT = 'Pictogram by Sergio Palao, ARASAAC (Government of Aragón), CC BY-NC-SA 4.0'
const OPENMOJI_CREDIT = 'OpenMoji (HFG Schwäbisch Gmünd), CC BY-SA 4.0'
const OPENMOJI_VERSION = '15.0.0'

type WordRow = { english: string; filipino: string }
type Found = {
    bytes: Uint8Array
    contentType: string
    ext: 'png' | 'svg'
    source: 'arasaac' | 'openmoji'
    credit: string
    sourceUrl: string
}

// Function/abstract words: the banks return meaningless arrows and symbols
// for these, which is worse than the placeholder, so they're never imported.
const FUNCTION_WORDS = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'of', 'to', 'in', 'on', 'at', 'for', 'with', 'from', 'by', 'as',
    'is', 'are', 'was', 'were', 'be', 'been', 'it', 'he', 'she', 'we', 'they', 'i', 'you', 'this', 'that',
    'because', 'if', 'then', 'so', 'not', 'her', 'his', 'their', 'who', 'what', 'when', 'where', 'how',
])

// Must match normalizeImageWord() in src/hooks/useWordImage.ts.
function normalize(word: string): string {
    return word
        .toLowerCase()
        .replace(/[^\p{L}\p{N}']/gu, '')
        .replace(/'/g, '')
        .trim()
}

function parseCsv(path: string): WordRow[] {
    const lines = readFileSync(path, 'utf8')
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)
    const cells = (line: string) => line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''))
    const rows: WordRow[] = []
    for (const [i, line] of lines.entries()) {
        const [english = '', filipino = ''] = cells(line)
        if (i === 0 && english.toLowerCase() === 'english_word') continue
        if (english) rows.push({ english, filipino })
    }
    return rows
}

async function fetchBytes(url: string): Promise<Uint8Array | null> {
    const res = await fetch(url)
    if (!res.ok) return null
    return new Uint8Array(await res.arrayBuffer())
}

type ArasaacHit = { _id: number; violence?: boolean; keywords?: { keyword: string }[] }

async function findArasaac(term: string): Promise<Found | null> {
    const res = await fetch(`https://api.arasaac.org/v1/pictograms/en/search/${encodeURIComponent(term)}`)
    if (!res.ok) return null
    const hits = (await res.json()) as ArasaacHit[]
    const clean = hits.filter((h) => !h.violence)
    // Prefer a pictogram that has this exact word as a keyword over a
    // looser match the search returned first.
    const exact = clean.find((h) => h.keywords?.some((k) => k.keyword.toLowerCase() === term.toLowerCase()))
    const hit = exact ?? clean[0]
    if (!hit) return null
    const sourceUrl = `https://static.arasaac.org/pictograms/${hit._id}/${hit._id}_500.png`
    const bytes = await fetchBytes(sourceUrl)
    if (!bytes) return null
    return { bytes, contentType: 'image/png', ext: 'png', source: 'arasaac', credit: ARASAAC_CREDIT, sourceUrl }
}

type OpenMojiEntry = { hexcode: string; annotation: string; tags: string; openmoji_tags: string; group: string }
let openMojiCache: OpenMojiEntry[] | null = null

async function findOpenMoji(term: string): Promise<Found | null> {
    if (!openMojiCache) {
        const res = await fetch(`https://cdn.jsdelivr.net/gh/hfg-gmuend/openmoji@${OPENMOJI_VERSION}/data/openmoji.json`)
        openMojiCache = res.ok ? ((await res.json()) as OpenMojiEntry[]) : []
    }
    const t = term.toLowerCase()
    // Plain symbols only — skip flags, skin-tone variants, etc.
    const entry = openMojiCache.find(
        (e) => e.annotation.toLowerCase() === t && !e.hexcode.includes('-') && e.group !== 'flags',
    )
    if (!entry) return null
    const sourceUrl = `https://cdn.jsdelivr.net/gh/hfg-gmuend/openmoji@${OPENMOJI_VERSION}/color/svg/${entry.hexcode}.svg`
    const bytes = await fetchBytes(sourceUrl)
    if (!bytes) return null
    return { bytes, contentType: 'image/svg+xml', ext: 'svg', source: 'openmoji', credit: OPENMOJI_CREDIT, sourceUrl }
}

async function main() {
    const args = process.argv.slice(2)
    const csvPath = args.find((a) => !a.startsWith('--'))
    if (!csvPath) throw new Error('Usage: import-word-images.ts <words.csv> [--dry-run] [--limit N] [--force]')
    const dryRun = args.includes('--dry-run')
    const force = args.includes('--force')
    const limitIdx = args.indexOf('--limit')
    const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) : Infinity

    const rows = parseCsv(csvPath).slice(0, limit)
    console.log(`${rows.length} word(s) from ${csvPath}${dryRun ? ' (dry run — nothing uploaded)' : ''}\n`)

    const missing: WordRow[] = []
    let added = 0
    let skipped = 0

    for (const row of rows) {
        const enKey = normalize(row.english)
        if (!enKey) continue
        if (FUNCTION_WORDS.has(enKey)) {
            console.log(`  - ${row.english}: function word, no picture`)
            continue
        }

        if (!force) {
            const { data: existing } = await supabase
                .from('word_images')
                .select('image_path, source, credit, source_url')
                .eq('language', 'en')
                .eq('word', enKey)
                .maybeSingle()
            if (existing) {
                // The English meaning already has a picture (an earlier row,
                // or an earlier run) — reuse it for this Filipino spelling
                // instead of fetching again, so "school" can map from
                // paaralan, eskwelahan, eskwela... to one file.
                const filKey = normalize(row.filipino)
                if (filKey) {
                    const { error: filErr } = dryRun
                        ? { error: null }
                        : await supabase
                              .from('word_images')
                              .upsert({ language: 'fil', word: filKey, ...existing }, { onConflict: 'language,word' })
                    if (filErr) console.error(`    fil row failed for ${row.filipino}: ${filErr.message}`)
                }
                console.log(`  = ${row.english}${row.filipino ? ` / ${row.filipino}` : ''}: picture already exists, reused`)
                skipped++
                continue
            }
        }

        const found = (await findArasaac(row.english)) ?? (await findOpenMoji(row.english))
        if (!found) {
            console.log(`  ✗ ${row.english}: no match`)
            missing.push(row)
            continue
        }
        console.log(`  ✓ ${row.english}${row.filipino ? ` / ${row.filipino}` : ''}: ${found.source} (${found.sourceUrl})`)
        if (dryRun) continue

        const imagePath = `${enKey}.${found.ext}`
        const { error: uploadErr } = await supabase.storage
            .from(BUCKET)
            .upload(imagePath, found.bytes, { contentType: found.contentType, upsert: true })
        if (uploadErr) {
            console.error(`    upload failed: ${uploadErr.message}`)
            missing.push(row)
            continue
        }

        const records = [{ language: 'en', word: enKey }]
        const filKey = normalize(row.filipino)
        if (filKey) records.push({ language: 'fil', word: filKey })
        const { error: rowErr } = await supabase.from('word_images').upsert(
            records.map((r) => ({
                ...r,
                image_path: imagePath,
                source: found.source,
                credit: found.credit,
                source_url: found.sourceUrl,
            })),
            { onConflict: 'language,word' },
        )
        if (rowErr) {
            console.error(`    row insert failed: ${rowErr.message}`)
            missing.push(row)
            continue
        }
        added++
    }

    const missingPath = csvPath.replace(/\.csv$/i, '') + '.missing.csv'
    writeFileSync(
        missingPath,
        'english_word,filipino_word\n' + missing.map((m) => `${m.english},${m.filipino}`).join('\n') + '\n',
    )
    console.log(`\nDone: ${added} added, ${skipped} skipped, ${missing.length} missing (listed in ${missingPath})`)
}

main().catch((err) => {
    console.error(err)
    process.exit(1)
})
