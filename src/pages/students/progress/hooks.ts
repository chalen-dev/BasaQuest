// File: hooks.ts
// File: src/pages/students/progress/hooks.ts
//
// Data layer for TeacherDashboard.tsx (the "Progress" tab) — a thin
// wrapper around public.teacher_dashboard_summary (see its own migration,
// 20260909020000_create_teacher_dashboard_summary.sql, for why that's a
// view rather than client-side aggregation). All the actual per-pupil
// aggregation (latest/previous attempt per language, pending flagged word
// count, stale remediation) already happened server-side; this just
// fetches the pre-computed rows and orders them.
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabaseClient'

export type ProgressSort = 'attention' | 'name_asc' | 'grade_asc' | 'section_asc'

export type TeacherDashboardSummaryRow = {
    student_id: string
    username: string | null
    full_name: string | null
    grade_level: number | null
    section: string | null
    is_disabled: boolean
    en_latest_attempt_id: string | null
    en_latest_accuracy: number | null
    en_latest_attempt_at: string | null
    en_prev_accuracy: number | null
    fil_latest_attempt_id: string | null
    fil_latest_accuracy: number | null
    fil_latest_attempt_at: string | null
    fil_prev_accuracy: number | null
    last_attempt_at: string | null
    worst_recent_accuracy: number | null
    pending_flagged_word_count: number
    has_stale_remediation: boolean
}

const teacherDashboardSummaryKey = (teacherId: string | undefined, sort: ProgressSort) =>
    ['teacher-dashboard-summary', teacherId, sort] as const

export function useTeacherDashboardSummaryQuery(teacherId: string | undefined, sort: ProgressSort) {
    return useQuery({
        queryKey: teacherDashboardSummaryKey(teacherId, sort),
        queryFn: async () => {
            // The column list must be a literal string (not a variable)
            // passed straight into .select() — supabase-js only infers a
            // typed row shape from a string literal it can parse at the
            // call site, so anything else silently falls back to a
            // generic error type instead of TeacherDashboardSummaryRow.
            let query = supabase
                .from('teacher_dashboard_summary')
                .select(`student_id, username, full_name, grade_level, section, is_disabled, en_latest_attempt_id, en_latest_accuracy, en_latest_attempt_at, en_prev_accuracy, fil_latest_attempt_id, fil_latest_accuracy, fil_latest_attempt_at, fil_prev_accuracy, last_attempt_at, worst_recent_accuracy, pending_flagged_word_count, has_stale_remediation`)

            // "attention" is the tiered default this screen opens on
            // (capstone requirement: surface who needs attention, not an
            // alphabetical roster) — deliberately three separate ORDER BY
            // columns rather than one blended score, so the ranking stays
            // legible ("most flagged words first, then longest silence,
            // then lowest score") instead of hiding behind invented
            // weights. The other three options are plain single-column
            // sorts a teacher can switch to on purpose.
            if (sort === 'attention') {
                query = query
                    .order('pending_flagged_word_count', { ascending: false })
                    .order('last_attempt_at', { ascending: true, nullsFirst: true })
                    .order('worst_recent_accuracy', { ascending: true, nullsFirst: false })
            } else if (sort === 'grade_asc') {
                query = query
                    .order('grade_level', { ascending: true, nullsFirst: false })
                    .order('full_name', { ascending: true })
            } else if (sort === 'section_asc') {
                query = query
                    .order('section', { ascending: true, nullsFirst: false })
                    .order('full_name', { ascending: true })
            } else {
                query = query.order('full_name', { ascending: true })
            }

            const { data, error } = await query
            if (error) throw error
            return (data ?? []) as TeacherDashboardSummaryRow[]
        },
        enabled: !!teacherId,
    })
}

export type Trend = 'up' | 'down' | 'flat' | 'none'

// 'none' when there's no earlier attempt to compare against yet (a first
// attempt, or a language the pupil hasn't tried) — deliberately distinct
// from 'flat' (two attempts, same score) since "not enough data" and "no
// change" read very differently to a teacher.
export function computeTrend(latest: number | null, previous: number | null): Trend {
    if (latest == null || previous == null) return 'none'
    if (latest > previous) return 'up'
    if (latest < previous) return 'down'
    return 'flat'
}

// DEMO-ONLY — see devFlags.ts's SHOW_MOCK_COMPREHENSION_HISTORY. Neither
// comprehension_sessions nor history_sessions exists, so there is no real
// number to show. This fabricates one, deterministically from the
// pupil's own id (not random), so a screenshot doesn't show a different
// score every time the dashboard re-renders or re-sorts. NEVER read when
// the flag is off — ProgressRow.tsx falls back to the real "Coming soon"
// badge in that case.
function hashSeed(seed: string): number {
    let h = 0
    for (let i = 0; i < seed.length; i++) {
        h = (h * 31 + seed.charCodeAt(i)) | 0
    }
    return Math.abs(h)
}

export type MockTrackScore = { score: number; trend: Trend }

const MOCK_TRENDS: Trend[] = ['up', 'down', 'flat']

export function mockTrackScore(studentId: string, track: 'comprehension' | 'history'): MockTrackScore {
    const h = hashSeed(`${studentId}:${track}`)
    return {
        score: 55 + (h % 41), // 55-95, a plausible quiz/module range
        trend: MOCK_TRENDS[Math.floor(h / 41) % MOCK_TRENDS.length],
    }
}
