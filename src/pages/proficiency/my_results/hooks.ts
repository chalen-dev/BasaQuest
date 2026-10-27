// File: src/pages/proficiency/my_results/hooks.ts
// A pupil's own confirmed check-in results. A reading only counts once the
// teacher has reviewed it (reviewed_at is set), so nothing here ever shows a
// score the teacher hasn't signed off. RLS already lets a pupil read their own
// attempts and words, so this needs no database change.
//
// "Unseen" (the new-result badge) is a per-browser convenience kept in
// localStorage: ids of results the pupil has already opened. It can come back
// empty (private window, cleared data), in which case old results show as new
// once, which is harmless.
import { useMemo, useSyncExternalStore } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabaseClient.ts'
import type { Lang } from '../../../components/buttons/LangToggle.tsx'

export type MyReviewedAttempt = {
    id: string
    language: Lang
    passage_title: string | null
    duration_seconds: number | null
    created_at: string
    reviewed_at: string
}

export type MyAttemptWord = {
    word_index: number
    reference_word: string | null
    system_verdict: 'correct' | 'miscue'
    teacher_verdict: 'correct' | 'miscue' | null
}

// Recent results only: a pupil's page is about how the last readings went.
const RESULTS_LIMIT = 5

export function useMyReviewedAttemptsQuery(studentId: string | undefined) {
    return useQuery({
        queryKey: ['my-reviewed-attempts', studentId],
        enabled: !!studentId,
        refetchInterval: 60_000,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('assessment_attempts')
                .select('id, language, passage_title, duration_seconds, created_at, reviewed_at')
                .eq('student_id', studentId as string)
                .not('reviewed_at', 'is', null)
                .order('reviewed_at', { ascending: false })
                .limit(RESULTS_LIMIT)
            if (error) throw error
            return (data ?? []) as MyReviewedAttempt[]
        },
    })
}

export function useMyAttemptWordsQuery(attemptId: string) {
    return useQuery({
        queryKey: ['my-attempt-words', attemptId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('assessment_attempt_words')
                .select('word_index, reference_word, system_verdict, teacher_verdict')
                .eq('attempt_id', attemptId)
                .order('word_index', { ascending: true })
            if (error) throw error
            return (data ?? []) as MyAttemptWord[]
        },
    })
}

// ---- results the pupil has already opened ----

const seenKey = (studentId: string) => `bq-seen-results:${studentId}`
const listeners = new Set<() => void>()

function readSeen(studentId: string): string {
    try {
        return localStorage.getItem(seenKey(studentId)) ?? ''
    } catch {
        return ''
    }
}

export function markResultsSeen(studentId: string, ids: string[]) {
    const known = new Set(readSeen(studentId).split(',').filter(Boolean))
    const before = known.size
    ids.forEach((id) => known.add(id))
    if (known.size === before) return
    try {
        localStorage.setItem(seenKey(studentId), Array.from(known).join(','))
    } catch {
        // Storage is unavailable: the badge just comes back next visit.
    }
    listeners.forEach((notify) => notify())
}

function subscribe(notify: () => void) {
    listeners.add(notify)
    return () => {
        listeners.delete(notify)
    }
}

// How many confirmed results the pupil hasn't opened yet.
export function useUnseenResultCount(studentId: string | undefined): number {
    const { data } = useMyReviewedAttemptsQuery(studentId)
    const seenRaw = useSyncExternalStore(subscribe, () => (studentId ? readSeen(studentId) : ''))
    return useMemo(() => {
        const seen = new Set(seenRaw.split(',').filter(Boolean))
        return (data ?? []).filter((a) => !seen.has(a.id)).length
    }, [data, seenRaw])
}

// ---- turning word rows into the numbers the page shows ----

export type ResultSummary = {
    totalWords: number
    correctWords: number
    accuracyPercent: number
    wordsPerMinute: number | null
    practiceWords: string[]
}

export function summarizeResult(words: MyAttemptWord[], durationSeconds: number | null): ResultSummary {
    // Inserted words (extra words said) have no reference word and don't
    // count toward the passage.
    const passageWords = words.filter((w) => w.reference_word)
    const verdictOf = (w: MyAttemptWord) => w.teacher_verdict ?? w.system_verdict
    const correctWords = passageWords.filter((w) => verdictOf(w) === 'correct').length
    const totalWords = passageWords.length
    const practice = new Set<string>()
    passageWords.forEach((w) => {
        if (verdictOf(w) === 'miscue') practice.add((w.reference_word as string).toLowerCase().replace(/[^\p{L}\p{N}'-]/gu, ''))
    })
    practice.delete('')
    return {
        totalWords,
        correctWords,
        accuracyPercent: totalWords > 0 ? Math.round((correctWords / totalWords) * 100) : 0,
        wordsPerMinute: durationSeconds && durationSeconds > 0 ? Math.round(correctWords / (durationSeconds / 60)) : null,
        practiceWords: Array.from(practice).slice(0, 8),
    }
}
