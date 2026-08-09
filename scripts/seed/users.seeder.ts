// File: scripts/seed/users.seeder.ts
import { supabase } from '../client.ts'

const DEMO_USERS = [
    { username: 'guro', name: 'Teacher Guro' },
    { username: 'maria', name: 'Maria Santos' },
    { username: 'ramon', name: 'Ramon Cruz' },
    { username: 'liza', name: 'Liza Reyes' },
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
                role: 'teacher',
            })
            .eq('id', data.user!.id)
        console.log(profileError ? `  ✗ profile for ${u.username}: ${profileError.message}` : `  ✓ ${u.username}`)
    }
}