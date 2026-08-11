// File: scripts/seed/students.seeder.ts
import { supabase } from '../client.ts'

const DEMO_STUDENTS = [
    { username: 'ella', name: 'Ella Santos', teacherUsername: 'guro', gradeLevel: 3, section: 'Sampaguita', isNonReader: false },
    { username: 'jose', name: 'Jose Miguel', teacherUsername: 'guro', gradeLevel: 4, section: 'Rosal', isNonReader: false },
    { username: 'carlo', name: 'Carlo Reyes', teacherUsername: 'guro', gradeLevel: 5, section: 'Ilang-Ilang', isNonReader: false },
    { username: 'nina', name: 'Nina Bautista', teacherUsername: 'guro', gradeLevel: 1, section: 'Gumamela', isNonReader: true },
]

export async function seedStudents() {
    console.log('Seeding students...')

    // Resolve each distinct teacher username -> profile id once, instead of
    // hitting the DB per-student for the same teacher.
    const teacherUsernames = [...new Set(DEMO_STUDENTS.map((s) => s.teacherUsername))]
    const { data: teachers, error: teacherLookupError } = await supabase
        .from('profiles')
        .select('id, username')
        .in('username', teacherUsernames)

    if (teacherLookupError) {
        console.error(`  ✗ couldn't look up teacher accounts: ${teacherLookupError.message}`)
        return
    }

    const teacherIdByUsername = new Map((teachers ?? []).map((t) => [t.username, t.id]))

    for (const s of DEMO_STUDENTS) {
        const teacherId = teacherIdByUsername.get(s.teacherUsername)
        if (!teacherId) {
            console.error(`  ✗ ${s.username}: teacher "${s.teacherUsername}" not found — seed users first`)
            continue
        }

        const email = `${s.username}@basaquest.local`
        const { data, error } = await supabase.auth.admin.createUser({
            email,
            password: 'basaquest',
            email_confirm: true,
            user_metadata: { username: s.username, name: s.name },
        })
        if (error) {
            console.error(`  ✗ ${s.username}: ${error.message}`)
            continue
        }

        // Same pattern as users.seeder.ts — the on_auth_user_created trigger
        // already inserted a bare profile row (role defaults to 'teacher'),
        // so we UPDATE it here into a proper pupil profile.
        const { error: profileError } = await supabase
            .from('profiles')
            .update({
                full_name: s.name,
                role: 'student',
                teacher_id: teacherId,
                grade_level: s.gradeLevel,
                section: s.section,
                is_non_reader: s.isNonReader,
            })
            .eq('id', data.user!.id)

        console.log(profileError ? `  ✗ profile for ${s.username}: ${profileError.message}` : `  ✓ ${s.username} (under ${s.teacherUsername})`)
    }
}