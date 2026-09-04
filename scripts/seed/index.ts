// File: scripts/seed/index.ts
import { seedUsers } from './users.seeder.ts'
import { seedStudents } from './students.seeder.ts'
import { seedSentenceSets } from './sentence_sets.seeder.ts'
import { seedSentences } from './sentences.seeder.ts'
import {seedFinetuneStudents} from "./finetune_students.seeder.js";
import { seedAssessmentAttempts } from './assessment_attempts.seeder.ts'
async function run() {
    await seedUsers()
    await seedStudents()
    await seedAssessmentAttempts()
    await seedFinetuneStudents()
    // Sets must seed before sentences — reading_sentences.sentence_set
    // has a foreign key into reading_sentence_sets.key.
    await seedSentenceSets()
    await seedSentences()
    console.log('✅ All seeders complete.')
    process.exit(0)
}
run().catch((err) => {
    console.error('❌ Seeding failed:', err)
    process.exit(1)
})