// File: scripts/word-images/compare-banks.ts
// Shows how the word-picture bank in two Supabase projects differs, for example
// your local stack against the deployed one. READ-ONLY: it never writes to
// either side, so it is safe to run any time.
//
//   npm run word-images:compare -- .env.local .env.cloud.local
//   npm run word-images:compare -- .env.local .env.cloud.local --all     (list every difference)
//
// Rows are matched by (language, word, sense). It reports rows only on one side,
// rows on both that differ (picture, reviewed flag, cue words, default), and how
// many pictures each side has marked reviewed.
import { readFileSync } from 'node:fs'
import dotenv from 'dotenv'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const PAGE = 1000

type Row = {
    language: string
    word: string
    image_path: string
    reviewed: boolean
    sense: string
    cues: string[]
    is_default: boolean
}

function clientFor(envFile: string): { client: SupabaseClient; url: string } {
    const env = dotenv.parse(readFileSync(envFile))
    const url = env.VITE_SUPABASE_URL
    const key = env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) throw new Error(`${envFile} needs VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.`)
    return { client: createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } }), url }
}

async function fetchAll(client: SupabaseClient): Promise<Row[]> {
    const rows: Row[] = []
    for (let from = 0; ; from += PAGE) {
        const { data, error } = await client
            .from('word_images')
            .select('language, word, image_path, reviewed, sense, cues, is_default')
            .order('id', { ascending: true })
            .range(from, from + PAGE - 1)
        if (error) throw error
        rows.push(...((data ?? []) as Row[]))
        if (!data || data.length < PAGE) return rows
    }
}

const keyOf = (r: Row) => `${r.language}:${r.word}${r.sense ? ` [${r.sense}]` : ''}`

function show(title: string, items: string[], all: boolean) {
    console.log(`\n${title}: ${items.length}`)
    const shown = all ? items : items.slice(0, 15)
    for (const item of shown) console.log(`  ${item}`)
    if (!all && items.length > shown.length) console.log(`  … and ${items.length - shown.length} more (use --all)`)
}

async function main() {
    const args = process.argv.slice(2)
    const all = args.includes('--all')
    const [fileA, fileB] = args.filter((a) => !a.startsWith('--'))
    if (!fileA || !fileB) throw new Error('Usage: compare-banks.ts <env file A> <env file B> [--all]')

    const a = clientFor(fileA)
    const b = clientFor(fileB)
    const [rowsA, rowsB] = await Promise.all([fetchAll(a.client), fetchAll(b.client)])
    console.log(`A = ${a.url}  (${fileA}): ${rowsA.length} word rows, ${new Set(rowsA.map((r) => r.image_path)).size} pictures`)
    console.log(`B = ${b.url}  (${fileB}): ${rowsB.length} word rows, ${new Set(rowsB.map((r) => r.image_path)).size} pictures`)

    const mapA = new Map(rowsA.map((r) => [keyOf(r), r]))
    const mapB = new Map(rowsB.map((r) => [keyOf(r), r]))

    const onlyA = [...mapA.keys()].filter((k) => !mapB.has(k))
    const onlyB = [...mapB.keys()].filter((k) => !mapA.has(k))
    const differ: string[] = []
    for (const [k, ra] of mapA) {
        const rb = mapB.get(k)
        if (!rb) continue
        const changes: string[] = []
        if (ra.image_path !== rb.image_path) changes.push(`picture ${ra.image_path} vs ${rb.image_path}`)
        if (ra.reviewed !== rb.reviewed) changes.push(`reviewed ${ra.reviewed} vs ${rb.reviewed}`)
        if (ra.is_default !== rb.is_default) changes.push(`default ${ra.is_default} vs ${rb.is_default}`)
        if (ra.cues.join(';') !== rb.cues.join(';')) changes.push('cue words differ')
        if (changes.length > 0) differ.push(`${k}: ${changes.join(', ')}`)
    }

    const reviewed = (rows: Row[]) => new Set(rows.filter((r) => r.reviewed).map((r) => r.image_path)).size
    console.log(`\nReviewed pictures: A ${reviewed(rowsA)}, B ${reviewed(rowsB)}`)
    show('Only on A', onlyA, all)
    show('Only on B', onlyB, all)
    show('On both but different', differ, all)
    if (onlyA.length + onlyB.length + differ.length === 0) console.log('\nThe two banks are identical.')
}

main().catch((err) => {
    console.error(err instanceof Error ? err.message : err)
    process.exit(1)
})
