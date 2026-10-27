// File: src/pages/proficiency/pre_assessment/savedPassages.ts
// Saved check-in passages for teacher-run ("Now") sessions: one row per pupil
// and language in the check_in_passages table (see its migration for why and
// for the 7-day expiry). The session screen loads, saves and clears a pupil's
// passage here, and the student picker reads the list to show its badges.
// A pupil's own session only READS its passage from here (once the teacher
// has validated and sent it) and deletes it after submitting; pupils never
// generate or save one.
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

// For a pupil: the languages they have a teacher-validated passage waiting in
// (at most two, since a pupil has one passage per language). Drives the
// "passage ready" card on the practice page and the badge on its nav tab.
// RLS already limits a pupil to their own approved, unexpired rows; polled so
// a passage sent while they are on the page shows up without a reload.
export function useReadyPassageLangsQuery(studentId: string | undefined) {
    return useQuery({
        queryKey: ['ready-passages', studentId],
        enabled: !!studentId,
        refetchInterval: 30_000,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('check_in_passages')
                .select('language')
                .eq('student_id', studentId as string)
                .eq('status', 'approved')
                .gt('expires_at', notExpired())
            if (error) throw error
            return (data ?? []).map((row) => row.language as Lang)
        },
    })
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
