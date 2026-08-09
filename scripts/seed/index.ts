import { seedUsers } from './users.seeder.ts'

async function run() {
    // order matters — same rule as Laravel: seed parents before children
    await seedUsers()

    console.log('✅ All seeders complete.')
    process.exit(0)
}

run().catch((err) => {
    console.error('❌ Seeding failed:', err)
    process.exit(1)
})