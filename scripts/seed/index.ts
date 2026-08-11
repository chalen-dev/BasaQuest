import { seedUsers } from './users.seeder.ts'
import {seedStudents} from "./students.seeder.js";

async function run() {

    await seedUsers()
    await seedStudents()

    console.log('✅ All seeders complete.')
    process.exit(0)
}

run().catch((err) => {
    console.error('❌ Seeding failed:', err)
    process.exit(1)
})