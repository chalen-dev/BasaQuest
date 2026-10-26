// File: scripts/seed/guard.ts
// The full seeder (`npm run seed`) creates demo teachers and pupils whose
// password ("basaquest") is public in this repo. It must never touch a
// deployed project, so it only runs against the local stack. For the cloud
// there is `npm run seed:testdata`, which tags its accounts as test data and
// uses a private password instead.
export function assertSafeForDemoSeed(): void {
    const url = process.env.VITE_SUPABASE_URL ?? ''
    const isLocal = /^https?:\/\/(127\.0\.0\.1|localhost)(:|\/|$)/.test(url)
    if (!isLocal) {
        throw new Error(
            `Refusing to run the full demo seeder against ${url || '(no URL)'}.\n` +
                'It only runs against the local stack. For the cloud use: npm run seed:testdata',
        )
    }
}
