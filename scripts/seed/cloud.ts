// File: scripts/seed/cloud.ts
// What a freshly deployed project needs, and nothing more:
//   - your real admin accounts (SEED_ADMIN_ACCOUNTS_JSON in the env file)
//   - the recording sentence sets and sentences (plain reference data)
// Deliberately skips the demo teachers, demo students, fake assessment
// attempts and fake fine-tuning students that `npm run seed` creates —
// those use a public password and invented pupils.
//
//   npm run seed:cloud
//
// Reads .env.cloud.local by default (set ENV_FILE to use another file).

async function run() {
    // Chosen before the seeders load, because scripts/client.ts reads ENV_FILE on import.
    process.env.ENV_FILE ??= '.env.cloud.local'
    const { seedAdminsOnly } = await import('./users.seeder.ts')
    const { seedSentenceSets } = await import('./sentence_sets.seeder.ts')
    const { seedSentences } = await import('./sentences.seeder.ts')
    await seedAdminsOnly()
    await seedSentenceSets()
    await seedSentences()
    console.log('✅ Cloud seed complete.')
    process.exit(0)
}
run().catch((err) => {
    console.error('❌ Cloud seeding failed:', err)
    process.exit(1)
})
