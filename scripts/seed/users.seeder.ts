// File: scripts/seed/users.seeder.ts
import { supabase } from '../client.ts'

const DEMO_USERS = [
    { username: 'guro', name: 'Teacher Guro', role: 'teacher' as const },
    { username: 'maria', name: 'Maria Santos', role: 'teacher' as const },
    { username: 'ramon', name: 'Ramon Cruz', role: 'teacher' as const },
    { username: 'liza', name: 'Liza Reyes', role: 'teacher' as const },
    // Dev-only admin account for the child-recording page. Same
    // basaquest.local / 'basaquest' password convention as everyone else —
    // fine for local dev seeding, but re-check this before ever running
    // this seeder against a real/shared environment (see note below).
    { username: 'admin', name: 'Admin Account', role: 'admin' as const },
]

export async function seedUsers() {
    console.log('Seeding users...')
    for (const u of DEMO_USERS) {
        const email = `${u.username}@basaquest.local`
        const { data, error } = await supabase.auth.admin.createUser({
            email,
            password: 'basaquest',
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