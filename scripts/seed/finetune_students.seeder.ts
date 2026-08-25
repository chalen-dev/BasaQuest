// File: scripts/seed/finetune_students.seeder.ts
// Demo roster for the child-recording fine-tuning pilot — finetune_students
// (see its migration comment: intentionally separate from `profiles`,
// these aren't BasaQuest app accounts and don't need a login at all).
//
// Unlike users.seeder.ts/students.seeder.ts, there's no natural unique
// key to upsert against here — finetune_students has no unique
// constraint besides its generated `id`, and these rows aren't Supabase
// Auth users with an email either. So instead of upsert-on-conflict,
// this is safe-to-re-run by checking full_name against what's already in
// the table and skipping anything that's already there.
//
// consent_on_file is left false for everyone here on purpose — per the
// column's own migration comment it's effectively unused now (the
// "has ≥1 consent file attached" signal replaced it, see
// useConsentFiles.ts's useConsentFileCountsQuery), and this seeder has no
// files to attach, so setting it true would just be a lie about paperwork
// that doesn't exist.
import { supabase } from '../client.ts'
import type { ReadingTier } from '../../src/pages/admin/_hooks/useFinetuneStudents.ts'

type SeedFinetuneStudent = {
    full_name: string
    grade_level: number | null
    gender: 'male' | 'female' | null
    reading_tier: ReadingTier | null
    notes: string | null
}

const DEMO_FINETUNE_STUDENTS: SeedFinetuneStudent[] = [
    { full_name: 'Liam Dela Cruz', grade_level: 1, gender: 'male', reading_tier: 'below', notes: 'Non-reader — pilot priority per recording plan.' },
    { full_name: 'Zoe Mendoza', grade_level: 1, gender: 'female', reading_tier: 'below', notes: 'Non-reader — pilot priority per recording plan.' },
    { full_name: 'Kian Bautista', grade_level: 2, gender: 'male', reading_tier: 'on', notes: null },
    { full_name: 'Trisha Aguilar', grade_level: 2, gender: 'female', reading_tier: 'above', notes: null },
    { full_name: 'Enzo Villareal', grade_level: 2, gender: 'male', reading_tier: 'on', notes: null },
    { full_name: 'Maya Concepcion', grade_level: 3, gender: 'female', reading_tier: 'on', notes: null },
    { full_name: 'Rian Espiritu', grade_level: 3, gender: 'male', reading_tier: 'below', notes: 'Reads slowly but accurately.' },
    { full_name: 'Alessa Fajardo', grade_level: 3, gender: 'female', reading_tier: 'above', notes: null },
    { full_name: 'Miko Santiago', grade_level: 4, gender: 'male', reading_tier: 'on', notes: null },
    { full_name: 'Dana Ilagan', grade_level: 4, gender: 'female', reading_tier: 'on', notes: null },
    { full_name: 'Theo Marquez', grade_level: 4, gender: 'male', reading_tier: 'below', notes: null },
    { full_name: 'Kyla Rosario', grade_level: 5, gender: 'female', reading_tier: 'above', notes: 'Strong g3_4 script reader, good for clean fine-tuning takes.' },
    { full_name: 'Basti Ocampo', grade_level: 5, gender: 'male', reading_tier: 'on', notes: null },
    { full_name: 'Pia Serrano', grade_level: 5, gender: 'female', reading_tier: 'on', notes: null },
    { full_name: 'Julio Nepomuceno', grade_level: 6, gender: 'male', reading_tier: 'above', notes: null },
    { full_name: 'Reyna Custodio', grade_level: 6, gender: 'female', reading_tier: 'on', notes: null },
]

export async function seedFinetuneStudents() {
    console.log('Seeding fine-tune students...')

    const { data: existingRows, error: fetchErr } = await supabase.from('finetune_students').select('full_name')
    if (fetchErr) {
        console.error(`  ✗ couldn't check existing fine-tune students: ${fetchErr.message}`)
        return
    }
    const existingNames = new Set((existingRows ?? []).map((r) => r.full_name))

    // created_by is nullable, so a missing "admin" account just means the
    // rows are seeded with no creator attributed rather than failing.
    const { data: adminProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', 'admin')
        .maybeSingle()
    const createdBy = adminProfile?.id ?? null

    const toInsert = DEMO_FINETUNE_STUDENTS.filter((s) => !existingNames.has(s.full_name)).map((s) => ({
        full_name: s.full_name,
        grade_level: s.grade_level,
        gender: s.gender,
        reading_tier: s.reading_tier,
        consent_on_file: false,
        notes: s.notes,
        created_by: createdBy,
    }))

    if (toInsert.length === 0) {
        console.log('  ✓ already seeded (no new names to add)')
        return
    }

    const { error } = await supabase.from('finetune_students').insert(toInsert)
    if (error) {
        console.error(`  ✗ fine-tune students: ${error.message}`)
        return
    }

    const skipped = DEMO_FINETUNE_STUDENTS.length - toInsert.length
    console.log(`  ✓ ${toInsert.length} fine-tune student(s) added${skipped > 0 ? ` (${skipped} already existed, skipped)` : ''}`)
}