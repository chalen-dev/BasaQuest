// File: scripts/seed/users.seeder.ts
import { supabase } from '../client.ts'

type SeedAccount = { username: string; name: string; password: string; role: 'teacher' | 'admin' }

// Teacher demo accounts — throwaway demo data (same as your README already
// documents), so these stay hardcoded.
const DEMO_TEACHERS: SeedAccount[] = [
    { username: 'guro', name: 'Teacher Guro', password: 'basaquest', role: 'teacher' },
    { username: 'maria', name: 'Maria Santos', password: 'basaquest', role: 'teacher' },
    { username: 'ramon', name: 'Ramon Cruz', password: 'basaquest', role: 'teacher' },
    { username: 'liza', name: 'Liza Reyes', password: 'basaquest', role: 'teacher' },
]

// Admin accounts are more sensitive, so real names/passwords come from an
// env var instead of living in source. Set SEED_ADMIN_ACCOUNTS_JSON in
// .env.local (gitignored — never committed) to something like:
//   SEED_ADMIN_ACCOUNTS_JSON=[{"username":"chael","name":"Chael Lusaya","password":"a-real-password-here"}]
// Unset -> falls back to one throwaway dev admin so seeding still works
// out of the box with nothing configured.
const DEFAULT_ADMIN_ACCOUNTS: SeedAccount[] = [
    { username: 'admin', name: 'Admin Account', password: 'basaquest', role: 'admin' },
]

function loadAdminAccounts(): SeedAccount[] {
    const raw = process.env.SEED_ADMIN_ACCOUNTS_JSON
    if (!raw) return DEFAULT_ADMIN_ACCOUNTS
    try {
        const parsed = JSON.parse(raw) as { username: string; name: string; password: string }[]
        if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('must be a non-empty JSON array')
        return parsed.map((a) => ({ ...a, role: 'admin' as const }))
    } catch (err) {
        console.error(
            `  ✗ SEED_ADMIN_ACCOUNTS_JSON is set but isn't valid JSON (${err instanceof Error ? err.message : err}) — falling back to the default dev admin.`,
        )
        return DEFAULT_ADMIN_ACCOUNTS
    }
}

export async function seedUsers() {
    console.log('Seeding users...')
    const accounts: SeedAccount[] = [...DEMO_TEACHERS, ...loadAdminAccounts()]
    for (const u of accounts) {
        const email = `${u.username}@basaquest.local`
        const { data, error } = await supabase.auth.admin.createUser({
            email,
            password: u.password,
            email_confirm: true,
            user_metadata: { username: u.username, name: u.name },
        })
        if (error) {
            console.error(`  ✗ ${u.username}: ${error.message}`)
            continue
        }
        // the on_auth_user_created trigger already created this row
        // (with id + username) the moment createUser() ran above —
        // so we UPDATE it here, not insert.
        const { error: profileError } = await supabase
            .from('profiles')
            .update({
                full_name: u.name,
                role: u.role,
            })
            .eq('id', data.user!.id)
        console.log(profileError ? `  ✗ profile for ${u.username}: ${profileError.message}` : `  ✓ ${u.username} (${u.role})`)
    }
}