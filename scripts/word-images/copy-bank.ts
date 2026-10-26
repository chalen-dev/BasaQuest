// File: scripts/word-images/copy-bank.ts
// Copies the word-picture bank (the word_images table plus the files in the
// word-images bucket) from one Supabase project to another, so the pictures
// you imported locally can be loaded into a deployed project without
// re-fetching everything from ARASAAC — and so a reviewer's progress on the
// deployed project (approved flags, replaced pictures, edited words) can be
// brought back down.
//
//   npm run word-images:copy -- --from .env.local --to .env.cloud.local
//   npm run word-images:copy -- --from .env.cloud.local --to .env.local
//
// Each env file needs VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (the
// service-role key bypasses RLS, so keep those files out of git — anything
// ending in .local is already ignored).
//
// Safe to re-run: files are uploaded with upsert and rows are upserted by
// (language, word, sense), so it only adds or updates, never deletes. A picture
// that was deleted on the source stays on the target until removed there.
// Rows are copied as they are — including their reviewed flag — so the
// source always wins for the words it has.
import { readFileSync } from 'node:fs'
import dotenv from 'dotenv'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const BUCKET = 'word-images'
const PAGE = 1000

type Row = {
    id: string
    language: 'en' | 'fil'
    word: string
    image_path: string
    source: string
    credit: string | null
    source_url: string | null
    reviewed: boolean
    reviewed_at: string | null
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

async function fetchAllRows(client: SupabaseClient): Promise<Row[]> {
    const rows: Row[] = []
    for (let from = 0; ; from += PAGE) {
        const { data, error } = await client
            .from('word_images')
            .select('id, language, word, image_path, source, credit, source_url, reviewed, reviewed_at, sense, cues, is_default')
            .order('id', { ascending: true })
            .range(from, from + PAGE - 1)
        if (error) throw error
        rows.push(...((data ?? []) as Row[]))
        if (!data || data.length < PAGE) return rows
    }
}

async function main() {
    const args = process.argv.slice(2)
    const get = (flag: string) => {
        const i = args.indexOf(flag)
        return i >= 0 ? args[i + 1] : undefined
    }
    // On Windows, npm can swallow the --from / --to flags and pass only their
    // values, so two bare arguments (from, then to) are accepted as well.
    const fromFile = get('--from') ?? args[0]
    const toFile = get('--to') ?? args[1]
    if (!fromFile || !toFile) throw new Error('Usage: copy-bank.ts --from <env file> --to <env file>')
    if (fromFile === toFile) throw new Error('--from and --to are the same file.')

    const source = clientFor(fromFile)
    const target = clientFor(toFile)
    console.log(`Copying the word bank\n  from ${source.url}\n    to ${target.url}\n`)

    const rows = await fetchAllRows(source.client)
    const paths = [...new Set(rows.map((r) => r.image_path))]
    console.log(`${rows.length} word rows, ${paths.length} picture files on the source.`)

    // Files first, so a row never points at a file that isn't there yet.
    let copied = 0
    let failed = 0
    const missing = new Set<string>()
    for (const [i, path] of paths.entries()) {
        const { data: blob, error: downloadErr } = await source.client.storage.from(BUCKET).download(path)
        if (downloadErr || !blob) {
            console.error(`  ✗ ${path}: couldn't download from the source (${downloadErr?.message ?? 'no data'})`)
            missing.add(path)
            failed++
            continue
        }
        const { error: uploadErr } = await target.client.storage
            .from(BUCKET)
            .upload(path, blob, { contentType: blob.type || undefined, upsert: true })
        if (uploadErr) {
            console.error(`  ✗ ${path}: upload failed (${uploadErr.message})`)
            missing.add(path)
            failed++
            continue
        }
        copied++
        if ((i + 1) % 100 === 0) console.log(`  …${i + 1} / ${paths.length} files`)
    }

    const usable = rows.filter((r) => !missing.has(r.image_path))
    for (let from = 0; from < usable.length; from += 500) {
        const batch = usable.slice(from, from + 500).map((r) => ({
            language: r.language,
            word: r.word,
            image_path: r.image_path,
            source: r.source,
            credit: r.credit,
            source_url: r.source_url,
            reviewed: r.reviewed,
            reviewed_at: r.reviewed_at,
            sense: r.sense,
            cues: r.cues,
            is_default: r.is_default,
        }))
        const { error } = await target.client.from('word_images').upsert(batch, { onConflict: 'language,word,sense' })
        if (error) throw error
    }
    console.log(`\nDone: ${copied} files and ${usable.length} word rows copied, ${failed} files skipped.`)
}

main().catch((err) => {
    console.error(err)
    process.exit(1)
})
