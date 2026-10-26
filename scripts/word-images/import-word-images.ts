// File: scripts/word-images/import-word-images.ts
// Fills the word_images table + word-images bucket from a CSV word list.
//
//   npm run word-images:import -- scripts/word-images/sample-words.csv [--dry-run] [--limit 20] [--force] [--exact] [--plurals] [--wikimedia]
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

// filipino and forms may each hold several spellings separated by ";" —
// forms are extra English spellings of the same picture (plurals, verb
// endings: "mango" -> "mangoes", "eat" -> "eating;ate").
type WordRow = { english: string; filipino: string; forms: string }
type Found = {
    bytes: Uint8Array
    contentType: string
    ext: 'png' | 'svg' | 'jpg'
    source: 'arasaac' | 'openmoji' | 'wikimedia'
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

const splitKeys = (cell: string) => [...new Set(cell.split(';').map(normalize).filter(Boolean))]

// --plurals: also store the regular plural / third-person spelling of the
// English word (dog -> dogs, bus -> buses, baby -> babies).
let autoPlurals = false
function pluralOf(word: string): string {
    if (/(s|x|z|ch|sh)$/.test(word)) return `${word}es`
    if (/[^aeiou]y$/.test(word)) return `${word.slice(0, -1)}ies`
    return `${word}s`
}

// Every word key a row's picture should be stored under, per language.
function keysFor(row: WordRow) {
    const base = normalize(row.english)
    return {
        en: [
            ...new Set([base, ...splitKeys(row.forms), ...(autoPlurals && !row.english.includes(' ') ? [pluralOf(base)] : [])]),
        ].filter(Boolean),
        fil: splitKeys(row.filipino),
    }
}

function parseCsv(path: string): WordRow[] {
    const lines = readFileSync(path, 'utf8')
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)
    const cells = (line: string) => line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''))
    const rows: WordRow[] = []
    for (const [i, line] of lines.entries()) {
        const [english = '', filipino = '', forms = ''] = cells(line)
        if (i === 0 && english.toLowerCase() === 'english_word') continue
        if (english) rows.push({ english, filipino, forms })
    }
    return rows
}

async function fetchBytes(url: string): Promise<Uint8Array | null> {
    const res = await fetch(url)
    if (!res.ok) return null
    return new Uint8Array(await res.arrayBuffer())
}

type ArasaacHit = { _id: number; violence?: boolean; keywords?: { keyword: string }[] }

async function findArasaac(term: string, exactOnly: boolean): Promise<Found | null> {
    const res = await fetch(`https://api.arasaac.org/v1/pictograms/en/search/${encodeURIComponent(term)}`)
    if (!res.ok) return null
    const hits = (await res.json()) as ArasaacHit[]
    const clean = hits.filter((h) => !h.violence)
    // Prefer a pictogram that has this exact word as a keyword over a
    // looser match the search returned first.
    const exact = clean.find((h) => h.keywords?.some((k) => k.keyword.toLowerCase() === term.toLowerCase()))
    const hit = exactOnly ? exact : (exact ?? clean[0])
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

// --wikimedia: last resort for words ARASAAC and OpenMoji don't have (mostly
// Philippine things: jeepney, adobo, barong). Only files under a licence that
// allows reuse with credit are accepted — CC0, public domain, CC BY and
// CC BY-SA, never NC/ND — and the author, licence and file page are stored as
// the credit. Photos are an automatic best guess: they land unreviewed.
const WIKIMEDIA_AGENT = 'BasaQuestCapstone/1.0 (educational, non-commercial reading app)'
const OK_LICENCE = /^(CC0|Public domain|PD|CC[ -]BY(-SA)?[ -]\d)/i
const BAD_LICENCE = /\b(NC|ND)\b|GFDL|fair use|non-?commercial/i
// Titles that are almost never the thing itself, plus anything unsuitable for
// a children's reading app.
const BAD_TITLE =
    /\b(map|flag|logo|poster|diagram|stamp|banner|coat of arms|sign|screenshot|portrait|statue|nude|naked|sex|bikini|gay|lgbt|protest|rally|drawing of)\b/i

type CommonsPage = {
    title: string
    index?: number
    imageinfo?: {
        thumburl?: string
        thumbwidth?: number
        thumbheight?: number
        descriptionurl: string
        extmetadata?: Record<string, { value: string }>
    }[]
}

// Wikimedia asks bots to go slowly and answers "too many requests" (429) when
// they don't. Wait between calls and retry a limited one, so a rate limit is
// never mistaken for "no picture exists".
async function wikimediaFetch(url: string): Promise<Response> {
    for (let attempt = 1; ; attempt++) {
        await new Promise((r) => setTimeout(r, 1200))
        const res = await fetch(url, { headers: { 'User-Agent': WIKIMEDIA_AGENT } })
        if (res.status !== 429 || attempt >= 5) return res
        const wait = Number(res.headers.get('retry-after')) || 10 * attempt
        console.log(`    (Wikimedia asked us to slow down, waiting ${wait}s)`)
        await new Promise((r) => setTimeout(r, wait * 1000))
    }
}

const stripHtml = (s: string) => s.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()

async function findWikimedia(term: string): Promise<Found | null> {
    const params = new URLSearchParams({
        action: 'query',
        format: 'json',
        generator: 'search',
        gsrsearch: `${term} filetype:bitmap|drawing`,
        gsrnamespace: '6',
        gsrlimit: '15',
        prop: 'imageinfo',
        iiprop: 'url|extmetadata',
        iiurlwidth: '512',
        iiextmetadatafilter: 'LicenseShortName|Artist',
    })
    const res = await wikimediaFetch(`https://commons.wikimedia.org/w/api.php?${params}`)
    if (!res.ok) throw new Error(`Wikimedia search failed (${res.status}) for "${term}"`)
    const json = (await res.json()) as { query?: { pages?: Record<string, CommonsPage> } }
    const pages = Object.values(json.query?.pages ?? {}).sort((a, b) => (a.index ?? 99) - (b.index ?? 99))

    const words = term.toLowerCase().split(/\s+/)
    for (const page of pages) {
        const info = page.imageinfo?.[0]
        if (!info?.thumburl) continue
        const title = page.title.replace(/^File:/, '').replace(/\.[a-z0-9]+$/i, '')
        const lower = title.toLowerCase()
        // The file name must mention the word, and not look like a map, sign...
        if (!words.every((w) => lower.includes(w)) || BAD_TITLE.test(title)) continue
        if ((info.thumbwidth ?? 0) < 300 || (info.thumbheight ?? 0) < 250) continue
        const licence = stripHtml(info.extmetadata?.LicenseShortName?.value ?? '')
        if (!OK_LICENCE.test(licence) || BAD_LICENCE.test(licence)) continue
        const artist = stripHtml(info.extmetadata?.Artist?.value ?? '').slice(0, 120) || 'Unknown author'
        const ext = /\.png$/i.test(info.thumburl) ? 'png' : 'jpg'
        const res2 = await wikimediaFetch(info.thumburl)
        if (!res2.ok) continue
        return {
            bytes: new Uint8Array(await res2.arrayBuffer()),
            contentType: ext === 'png' ? 'image/png' : 'image/jpeg',
            ext,
            source: 'wikimedia',
            credit: `"${title}" by ${artist}, ${licence}, via Wikimedia Commons`,
            sourceUrl: info.descriptionurl,
        }
    }
    return null
}

async function main() {
    const args = process.argv.slice(2)
    const csvPath = args.find((a) => !a.startsWith('--'))
    if (!csvPath) throw new Error('Usage: import-word-images.ts <words.csv> [--dry-run] [--limit N] [--force]')
    const dryRun = args.includes('--dry-run')
    const force = args.includes('--force')
    // --exact: only accept a pictogram that lists the searched word as one of
    // its own keywords, never the search engine's loosest first guess.
    const exactOnly = args.includes('--exact')
    autoPlurals = args.includes('--plurals')
    const useWikimedia = args.includes('--wikimedia')
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
                const keys = keysFor(row)
                const extra = [
                    ...keys.en.map((word) => ({ language: 'en', word })),
                    ...keys.fil.map((word) => ({ language: 'fil', word })),
                ]
                if (!dryRun && extra.length > 0) {
                    const { error: extraErr } = await supabase
                        .from('word_images')
                        .upsert(extra.map((r) => ({ ...r, ...existing })), { onConflict: 'language,word', ignoreDuplicates: true })
                    if (extraErr) console.error(`    extra rows failed for ${row.english}: ${extraErr.message}`)
                }
                console.log(`  = ${row.english}${row.filipino ? ` / ${row.filipino}` : ''}: picture already exists, reused`)
                skipped++
                continue
            }
        }

        const found =
            (await findArasaac(row.english, exactOnly)) ??
            (await findOpenMoji(row.english)) ??
            (useWikimedia
                ? await findWikimedia(row.english).catch((err: Error) => {
                      console.log(`    ${err.message}`)
                      return null
                  })
                : null)
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

        const keys = keysFor(row)
        const records = [
            ...keys.en.map((word) => ({ language: 'en', word })),
            ...keys.fil.map((word) => ({ language: 'fil', word })),
        ]
        const { error: rowErr } = await supabase.from('word_images').upsert(
            records.map((r) => ({
                ...r,
                image_path: imagePath,
                source: found.source,
                credit: found.credit,
                source_url: found.sourceUrl,
            })),
            // A word that already has a picture keeps it unless --force, so a
            // later row ("fur") can't silently take over an earlier one's
            // Filipino word ("balahibo" from "feather").
            { onConflict: 'language,word', ignoreDuplicates: !force },
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
        'english_word,filipino_word,english_forms\n' +
            missing.map((m) => `${m.english},${m.filipino},${m.forms}`).join('\n') +
            '\n',
    )
    console.log(`\nDone: ${added} added, ${skipped} skipped, ${missing.length} missing (listed in ${missingPath})`)
}

main().catch((err) => {
    console.error(err)
    process.exit(1)
})
