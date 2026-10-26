// File: scripts/seed/cloud.ts
// What a freshly deployed project needs, and nothing more:
//   - your real admin accounts (SEED_ADMIN_ACCOUNTS_JSON in the env file)
//   - the recording sentence sets and sentences (plain reference data)
// Deliberately skips the demo teachers, demo students, fake assessment
// attempts and fake fine-tuning students that `npm run seed` creates —
// those use a public password and invented pupils.
//
//   $env:ENV_FILE=".env.cloud.local"; npm run seed:cloud
import { seedAdminsOnly } from './users.seeder.ts'
import { seedSentenceSets } from './sentence_sets.seeder.ts'
import { seedSentences } from './sentences.seeder.ts'

async function run() {
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
