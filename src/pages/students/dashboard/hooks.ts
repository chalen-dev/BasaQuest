// File: hooks.ts
// File: src/pages/students/dashboard/hooks.ts
// Real data for Dashboard.tsx's stat cards + activity feed, replacing
// the DUMMY_ACTIVITY placeholder that screen shipped with. "Pending
// Review" itself is NOT here — that one's shared with ProtectedHeader's
// badge, so it lives in students/review/hooks.ts as
// usePendingReviewCountQuery instead of being duplicated.
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabaseClient'

export type DashboardStats = {
    totalStudents: number
    avgAccuracy: number | null
    avgWpm: number | null
}

export function useDashboardStatsQuery(teacherId: string | undefined) {
    return useQuery({
        queryKey: ['dashboard-stats', teacherId],
        queryFn: async (): Promise<DashboardStats> => {
            const { count: totalStudents, error: studentsError } = await supabase
                .from('profiles')
                .select('id', { count: 'exact', head: true })
                .eq('teacher_id', teacherId as string)
                .eq('role', 'student')
            if (studentsError) throw studentsError
            // Most-recent 50 scored attempts feed both the accuracy
            // average and the WPM estimate below — capped so this stays
            // a cheap query instead of aggregating a teacher's entire
            // history on every Dashboard load.
            const { data: attempts, error: attemptsError } = await supabase
                .from('assessment_attempts')
                .select('accuracy_score, passage_text, duration_seconds')
                .eq('teacher_id', teacherId as string)
                .eq('status', 'scored')
                .order('scored_at', { ascending: false })
                .limit(50)
            if (attemptsError) throw attemptsError
            const scored = attempts ?? []
            const accuracyScores = scored.map((a) => a.accuracy_score).filter((v): v is number => v != null)
            const avgAccuracy = accuracyScores.length > 0
                ? accuracyScores.reduce((sum, v) => sum + v, 0) / accuracyScores.length
                : null
            // Azure doesn't score words-per-minute directly — estimated
            // per attempt from the snapshotted passage_text's word count
            // over duration_seconds, then averaged across attempts.
            const wpmSamples = scored
                .map((a) => {
                    if (!a.duration_seconds || a.duration_seconds <= 0) return null
                    const wordCount = a.passage_text.trim().split(/\s+/).filter(Boolean).length
                    return (wordCount / a.duration_seconds) * 60
                })
                .filter((v): v is number => v != null)
            const avgWpm = wpmSamples.length > 0
                ? wpmSamples.reduce((sum, v) => sum + v, 0) / wpmSamples.length
                : null
            return { totalStudents: totalStudents ?? 0, avgAccuracy, avgWpm }
        },
        enabled: !!teacherId,
    })
}

export type RecentAttempt = {
    id: string
    student_id: string
    language: 'en' | 'fil'
    accuracy_score: number | null
    scored_at: string | null
    reviewed_at: string | null
    student: { full_name: string | null; username: string | null; grade_level: number | null } | null
}

export function useRecentAttemptsQuery(teacherId: string | undefined, limit: number = 6) {
    return useQuery({
        queryKey: ['dashboard-recent-attempts', teacherId, limit],
        queryFn: async (): Promise<RecentAttempt[]> => {
            const { data: attempts, error } = await supabase
                .from('assessment_attempts')
                .select('id, student_id, language, accuracy_score, scored_at, reviewed_at')
                .eq('teacher_id', teacherId as string)
                .eq('status', 'scored')
                .order('scored_at', { ascending: false })
                .limit(limit)
            if (error) throw error
            const studentIds = Array.from(new Set((attempts ?? []).map((a) => a.student_id)))
            let studentsById = new Map<string, { full_name: string | null; username: string | null; grade_level: number | null }>()
            if (studentIds.length > 0) {
                const { data: students, error: studentsError } = await supabase
                    .from('profiles')
                    .select('id, full_name, username, grade_level')
                    .in('id', studentIds)
                if (studentsError) throw studentsError
                studentsById = new Map((students ?? []).map((s) => [s.id, { full_name: s.full_name, username: s.username, grade_level: s.grade_level }]))
            }
            return (attempts ?? []).map((a) => ({ ...a, student: studentsById.get(a.student_id) ?? null }))
        },
        enabled: !!teacherId,
    })
}