import { supabase } from '../client.ts'

const DEMO_USERS = [
    { username: 'guro', role: 'teacher', name: 'Teacher Guro' },
    { username: 'ella', role: 'pupil', name: 'Ella', grade: 3, section: 'Masipag' },
    { username: 'jose', role: 'pupil', name: 'Jose', grade: 4, section: 'Matulungin' },
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
        const { error: profileError } = await supabase.from('profiles').insert({
            id: data.user!.id,
            username: u.username,
            role: u.role,
            name: u.name,
            grade: u.grade ?? null,
            section: u.section ?? null,
        })
        console.log(profileError ? `  ✗ profile for ${u.username}: ${profileError.message}` : `  ✓ ${u.username}`)
    }
}