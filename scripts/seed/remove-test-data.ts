// File: scripts/seed/remove-test-data.ts
// Deletes every account tagged is_test (test teachers and test pupils) with
// everything attached to them: attempts, assignments, reports, and their
// recordings in storage. Real accounts are never touched.
//
//   npm run unseed:testdata            shows what would be deleted (changes nothing)
//   npm run unseed:testdata -- --yes   actually deletes it
//
// Reads .env.cloud.local by default. Deleting an account cascades to its rows
// in the database, but storage files are not cascaded, so those are removed
// first.
process.env.ENV_FILE ??= '.env.cloud.local'

const RECORDINGS_BUCKET = 'assessment-recordings'

async function run() {
    const { supabase } = await import('../client.ts')
    const confirmed = process.argv.includes('--yes')

    const { data: tests, error } = await supabase
        .from('profiles')
        .select('id, username, role')
        .eq('is_test', true)
        .order('role')
    if (error) throw error
    if (!tests || tests.length === 0) {
        console.log(`No test accounts on ${process.env.VITE_SUPABASE_URL}. Nothing to remove.`)
        process.exit(0)
    }

    console.log(`${tests.length} test account(s) on ${process.env.VITE_SUPABASE_URL}:`)
    for (const t of tests) console.log(`  - ${t.username} (${t.role})`)
    if (!confirmed) {
        console.log('\nThis was a preview. Run again with --yes to delete them.')
        process.exit(0)
    }

    for (const t of tests) {
        const { data: files } = await supabase.storage.from(RECORDINGS_BUCKET).list(t.id)
        if (files && files.length > 0) {
            const { error: removeError } = await supabase.storage
                .from(RECORDINGS_BUCKET)
                .remove(files.map((f) => `${t.id}/${f.name}`))
            if (removeError) console.error(`  ✗ couldn't remove recordings for ${t.username}: ${removeError.message}`)
        }
        const { error: deleteError } = await supabase.auth.admin.deleteUser(t.id)
        console.log(deleteError ? `  ✗ ${t.username}: ${deleteError.message}` : `  ✓ removed ${t.username}`)
    }
    console.log('Done.')
    process.exit(0)
}
run().catch((err) => {
    console.error('❌ Failed:', err instanceof Error ? err.message : err)
    process.exit(1)
})
