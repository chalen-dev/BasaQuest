// File: src/pages/proficiency/pre_assessment/savedPassages.ts
// Saved check-in passages for teacher-run ("Now") sessions: one row per pupil
// and language in the check_in_passages table (see its migration for why and
// for the 7-day expiry). The session screen loads, saves and clears a pupil's
// passage here, and the student picker reads the list to show its badges.
// A pupil's own session doesn't use this; it keeps its passage in the tab
// (see passageCache.ts).
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabaseClient.ts'
import type { Lang } from '../../../components/buttons/LangToggle.tsx'
import type { Passage } from './assessment_session/assessmentSessionStrings.ts'

export type SavedPassageStatus = 'needs_validation' | 'approved'

export type SavedPassage = Passage & { approved: boolean }

const savedPassagesKey = (teacherId: string | undefined, lang: Lang | null) =>
    ['saved-passages', teacherId, lang] as const

const notExpired = () => new Date().toISOString()

// The pupil's saved passage in this language, or null when there is none (or
// it has expired).
export async function fetchSavedPassage(studentId: string, lang: Lang): Promise<SavedPassage | null> {
    const { data, error } = await supabase
        .from('check_in_passages')
        .select('title, passage, status')
        .eq('student_id', studentId)
        .eq('language', lang)
        .gt('expires_at', notExpired())
        .maybeSingle()
    if (error) throw error
    if (!data) return null
    return { title: data.title, passage: data.passage, approved: data.status === 'approved' }
}

type SaveArgs = {
    teacherId: string
    studentId: string
    lang: Lang
    passage: Passage
    // What the teacher asked for when generating.
    difficulty: number
    approved: boolean
}

// Saving again replaces the pupil's row and restarts its 7 days.
export async function saveSavedPassage({ teacherId, studentId, lang, passage, difficulty, approved }: SaveArgs): Promise<void> {
    const now = new Date()
    const { error } = await supabase.from('check_in_passages').upsert(
        {
            student_id: studentId,
            teacher_id: teacherId,
            language: lang,
            title: passage.title,
            passage: passage.passage,
            difficulty,
            status: approved ? 'approved' : 'needs_validation',
            approved_at: approved ? now.toISOString() : null,
            updated_at: now.toISOString(),
            expires_at: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
        { onConflict: 'student_id,language' },
    )
    if (error) throw error
}

export async function deleteSavedPassage(studentId: string, lang: Lang): Promise<void> {
    const { error } = await supabase.from('check_in_passages').delete().eq('student_id', studentId).eq('language', lang)
    if (error) throw error
}

// For the student picker: which pupils have a saved passage in this language,
// and whether it is validated yet.
export function useSavedPassageStatusesQuery(teacherId: string | undefined, lang: Lang | null) {
    return useQuery({
        queryKey: savedPassagesKey(teacherId, lang),
        enabled: !!teacherId && !!lang,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('check_in_passages')
                .select('student_id, status')
                .eq('language', lang as Lang)
                .gt('expires_at', notExpired())
            if (error) throw error
            return new Map((data ?? []).map((row) => [row.student_id as string, row.status as SavedPassageStatus]))
        },
    })
}
