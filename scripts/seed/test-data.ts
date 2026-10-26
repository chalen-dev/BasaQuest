// File: scripts/seed/test-data.ts
// Test accounts for the deployed project: one test teacher and a few test
// pupils (with fake attempts), all tagged is_test so they can be told apart
// from real accounts and removed later with `npm run unseed:testdata`.
//
//   npm run seed:testdata
//
// Reads .env.cloud.local by default. It needs SEED_TEST_PASSWORD in that file:
// a private password only your team knows, at least 12 characters and never the
// public demo one. Usernames are prefixed "test-" (test-guro, test-ella ...)
// so they cannot collide with a real person's. No admin account is created;
// admins are only the real ones from `npm run seed:cloud`.
process.env.ENV_FILE ??= '.env.cloud.local'

async function run() {
    const { createAccounts } = await import('./users.seeder.ts')
    const { seedTestStudents } = await import('./students.seeder.ts')
    const { seedAssessmentAttempts } = await import('./assessment_attempts.seeder.ts')
    // Loading the client reads the env file, so the password can only be checked after it.
    const { supabase } = await import('../client.ts')

    const password = process.env.SEED_TEST_PASSWORD ?? ''
    if (password.length < 12 || password.toLowerCase() === 'basaquest') {
        throw new Error(
            'Set SEED_TEST_PASSWORD in your env file first: a private password of at least 12 characters (not "basaquest").',
        )
    }

    console.log(`Seeding test data into ${process.env.VITE_SUPABASE_URL}`)
    await createAccounts([
        { username: 'test-guro', name: 'Test Teacher (Guro)', password, role: 'teacher', isTest: true },
        { username: 'test-ramon', name: 'Test Teacher (Ramon)', password, role: 'teacher', isTest: true },
    ])
    await seedTestStudents(password)
    await seedAssessmentAttempts('test-guro')

    // Everything created above must carry the tag; say so loudly if not.
    const { data, error } = await supabase.from('profiles').select('username, is_test').like('username', 'test-%')
    if (error) throw error
    const untagged = (data ?? []).filter((p) => !p.is_test)
    if (untagged.length > 0) {
        console.error(`❌ Not tagged as test data: ${untagged.map((p) => p.username).join(', ')}`)
        process.exit(1)
    }
    console.log(`✅ Test data ready: ${data?.length ?? 0} tagged accounts.`)
    process.exit(0)
}
run().catch((err) => {
    console.error('❌ Test seeding failed:', err instanceof Error ? err.message : err)
    process.exit(1)
})
