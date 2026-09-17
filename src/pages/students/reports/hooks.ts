// File: hooks.ts
// File: src/pages/students/reports/hooks.ts
//
// Data layer for the two printable reports (PupilProgressReport.tsx,
// ClassAnalyticsReport.tsx). Both RPCs (see
// supabase/migrations/20260909040000_create_progress_reports.sql) return
// one jsonb blob each rather than a row set — the shapes here mirror
// those functions' jsonb_build_object() calls field-for-field. If the
// migration's shape ever changes, these types are the other half that
// needs updating.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabaseClient'
import type { Lang as UiLang } from '../../../components/buttons/LangToggle'

export type ErrorType = 'Omission' | 'Insertion' | 'Mispronunciation'

export type ErrorBreakdown = Partial<Record<ErrorType, number>>

export type MissedWord = { word: string; miss_count: number }

export type LanguageReport = {
    attempt_count: number
    first_accuracy: number | null
    latest_accuracy: number | null
    improvement_delta: number | null
    avg_fluency: number | null
    avg_prosody: number | null
    avg_completeness: number | null
    error_breakdown: ErrorBreakdown
    total_errors: number
    top_missed_words: MissedWord[]
}

export type PupilProgressReport = {
    student: {
        id: string
        full_name: string | null
        username: string | null
        grade_level: number | null
        section: string | null
    }
    teacher_name: string | null
    period_start: string
    period_end: string
    by_language: { en: LanguageReport; fil: LanguageReport }
    remediation: { generated_count: number; practiced_count: number }
    notes: string | null
}

export type ScoreBand = '0-59' | '60-69' | '70-79' | '80-89' | '90-100'

export const SCORE_BANDS: ScoreBand[] = ['0-59', '60-69', '70-79', '80-89', '90-100']

// Subset of teacher_dashboard_summary's own columns (see
// pages/students/progress/hooks.ts) — the class report's needs_attention
// array is a jsonb snapshot of exactly those rows via to_jsonb(), so the
// shape here is deliberately identical rather than re-declared loosely.
export type NeedsAttentionRow = {
    student_id: string
    username: string | null
    full_name: string | null
    grade_level: number | null
    section: string | null
    is_disabled: boolean
    en_latest_accuracy: number | null
    en_latest_attempt_at: string | null
    fil_latest_accuracy: number | null
    fil_latest_attempt_at: string | null
    last_attempt_at: string | null
    worst_recent_accuracy: number | null
    pending_flagged_word_count: number
    has_stale_remediation: boolean
}

export type ClassAnalyticsReport = {
    teacher_name: string | null
    period_start: string
    period_end: string
    roster: {
        total_pupils: number
        active_pupils: number
        quiet_pupils: number
        quiet_threshold_days: number
    }
    score_distribution: Partial<Record<'en' | 'fil', Partial<Record<ScoreBand, number>>>>
    language_average_accuracy: Partial<Record<'en' | 'fil', number>>
    error_breakdown: ErrorBreakdown
    total_errors: number
    remediation: { generated_count: number; practiced_count: number }
    needs_attention: NeedsAttentionRow[]
}

export type PeriodPreset = '30' | '60' | '90' | 'custom'

// Half-open [start, end) — mirrors exactly how both RPCs filter
// (created_at >= p_period_start and created_at < p_period_end), so a
// custom end date picked as "today" still includes today's attempts.
export function periodFromPreset(preset: PeriodPreset, customStart?: string, customEnd?: string): { start: string; end: string } {
    if (preset === 'custom' && customStart && customEnd) {
        return { start: new Date(customStart).toISOString(), end: new Date(new Date(customEnd).getTime() + 24 * 60 * 60 * 1000).toISOString() }
    }
    const days = preset === '30' ? 30 : preset === '60' ? 60 : 90
    const end = new Date()
    const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000)
    return { start: start.toISOString(), end: end.toISOString() }
}

export function useGetPupilProgressReportQuery(studentId: string | undefined, periodStart: string, periodEnd: string) {
    return useQuery({
        queryKey: ['pupil-progress-report', studentId, periodStart, periodEnd],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_pupil_progress_report', {
                p_student_id: studentId,
                p_period_start: periodStart,
                p_period_end: periodEnd,
            })
            if (error) throw error
            return data as PupilProgressReport
        },
        enabled: !!studentId,
    })
}

export function useGetClassAnalyticsReportQuery(teacherId: string | undefined, periodStart: string, periodEnd: string) {
    return useQuery({
        queryKey: ['class-analytics-report', teacherId, periodStart, periodEnd],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_class_analytics_report', {
                p_period_start: periodStart,
                p_period_end: periodEnd,
            })
            if (error) throw error
            return data as ClassAnalyticsReport
        },
        enabled: !!teacherId,
    })
}

export function useUpsertPupilNoteMutation(studentId: string | undefined) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (note: string) => {
            if (!studentId) throw new Error('Missing student id')
            const { error } = await supabase
                .from('pupil_progress_notes')
                .upsert({ student_id: studentId, note, updated_at: new Date().toISOString() })
            if (error) throw error
        },
        onSuccess: () => {
            // Broad invalidation (not just this exact period's key) since
            // the note isn't period-scoped — any cached report for this
            // pupil, any period, is now showing a stale note.
            queryClient.invalidateQueries({ queryKey: ['pupil-progress-report', studentId], exact: false })
        },
    })
}

// UI display language (fil/en toggle) already has a `Lang` type in
// components/buttons/LangToggle — named differently here on purpose so
// it's never confused with THIS Lang (which reading track: en/fil),
// even though the two happen to share the same underlying string values.
export type TrackLang = 'en' | 'fil'

// One template sentence per error_type, written once rather than
// generated per pupil/period — see this feature's own design decision
// (deterministic lookup over an LLM call): reliable, free, and always
// available even if a report is generated offline/without network.
export const NEXT_FOCUS_SUGGESTIONS: Record<UiLang, Record<ErrorType, string>> = {
    en: {
        Omission: 'Recent attempts show a pattern of skipping words while reading — consider whole-passage read-aloud practice to build the habit of reading every word, not just the easy ones.',
        Insertion: 'Recent attempts show a pattern of adding words that aren’t in the passage — consider slower, pointer-guided reading so attention stays on the actual printed text.',
        Mispronunciation: 'Recent attempts show a pattern of mispronunciation, often on longer or multi-syllable words — consider syllable-blending practice to build comfort sounding out unfamiliar words.',
    },
    fil: {
        Omission: 'Ipinapakita ng kamakailang mga pagbasa na madalas nilalaktawan ang mga salita — subukan ang pagbasa nang malakas sa buong talata para mahasa ang gawi ng pagbasa ng bawat salita.',
        Insertion: 'Ipinapakita ng kamakailang mga pagbasa na may idinadagdag na salitang wala sa talata — subukan ang mas mabagal, gamit-turo na pagbasa para manatili ang atensyon sa aktwal na teksto.',
        Mispronunciation: 'Ipinapakita ng kamakailang mga pagbasa na madalas mali sa bigkas, lalo na sa mahahabang salita — subukan ang syllable-blending para mas komportable siyang bumigkas ng mga di-pamilyar na salita.',
    },
}

// Picks the dominant error type ACROSS BOTH languages' breakdowns
// combined — a single suggestion for the whole report, not one per
// language. Returns null when there were no errors at all in the
// period (nothing to suggest a focus on).
export function dominantErrorType(byLanguage: { en: LanguageReport; fil: LanguageReport }): ErrorType | null {
    const combined: ErrorBreakdown = {}
    for (const lang of ['en', 'fil'] as const) {
        for (const [type, count] of Object.entries(byLanguage[lang].error_breakdown)) {
            combined[type as ErrorType] = (combined[type as ErrorType] ?? 0) + (count ?? 0)
        }
    }
    let best: ErrorType | null = null
    let bestCount = 0
    for (const [type, count] of Object.entries(combined)) {
        if ((count ?? 0) > bestCount) {
            best = type as ErrorType
            bestCount = count ?? 0
        }
    }
    return best
}
