// File: scripts/clear-storage.ts
// Empties every Storage bucket this project uses, before a
// `supabase db reset` wipes their metadata out from under them:
//   - student-recordings, consent-files: the fine-tuning admin pilot
//   - assessment-recordings: the live pupil reading-assessment check-ins
//
// This has to run BEFORE db:reset, not after (unlike the DB seeders).
// Supabase Storage's bucket-listing API is backed by rows in the same
// Postgres database `db reset` resets — once that runs, storage.list()
// can no longer see files that were uploaded before the reset, even
// though the actual blobs are still sitting on disk. Running this after
// db:reset would mean silently orphaning every previously-uploaded file
// as pure filesystem bloat instead of actually removing it. In other
// words: this is what makes `npm run db:fresh` an ACTUALLY fresh start —
// empty tables *and* empty buckets, not empty tables plus a pile of
// orphaned files nothing can see anymore.
import { supabase } from './client.ts'

const BUCKETS_TO_CLEAR = ['student-recordings', 'consent-files', 'assessment-recordings']

async function listAllFiles(bucket: string, prefix = ''): Promise<string[]> {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 })
    if (error) {
        console.error(`  ✗ couldn't list "${prefix || '/'}" in ${bucket}: ${error.message}`)
        return []
    }
    const paths: string[] = []
    for (const entry of data ?? []) {
        const fullPath = prefix ? `${prefix}/${entry.name}` : entry.name
        // Storage doesn't have real folders — a "directory" entry comes
        // back with no id/metadata; an actual file always has one.
        if (entry.id === null) {
            paths.push(...(await listAllFiles(bucket, fullPath)))
        } else {
            paths.push(fullPath)
        }
    }
    return paths
}

async function clearBucket(bucket: string) {
    console.log(`Clearing storage bucket "${bucket}"...`)
    const paths = await listAllFiles(bucket)
    if (paths.length === 0) {
        console.log('  ✓ already empty')
        return
    }
    // storage.remove() has a practical per-call batch size — chunk
    // defensively rather than assuming any particular limit.
    const chunkSize = 100
    let removed = 0
    for (let i = 0; i < paths.length; i += chunkSize) {
        const chunk = paths.slice(i, i + chunkSize)
        const { error } = await supabase.storage.from(bucket).remove(chunk)
        if (error) {
            console.error(`  ✗ failed removing ${chunk.length} file(s): ${error.message}`)
            continue
        }
        removed += chunk.length
    }
    console.log(`  ✓ removed ${removed}/${paths.length} file(s)`)
}

async function run() {
    for (const bucket of BUCKETS_TO_CLEAR) {
        await clearBucket(bucket)
    }
    console.log('✅ Storage cleared.')
    process.exit(0)
}

run().catch((err) => {
    console.error('❌ Clearing storage failed:', err)
    process.exit(1)
})