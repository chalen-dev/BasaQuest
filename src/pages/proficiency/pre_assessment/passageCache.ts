// File: src/pages/proficiency/pre_assessment/passageCache.ts
// A pupil's OWN check-in passage (the non-assisted session) is kept in
// sessionStorage, per language, so a reload never spends AI credits on a
// passage that already exists (see the PASSAGE CACHING note in
// AssessmentSessionPage.tsx). A teacher-run session saves its passages on the
// server instead (savedPassages.ts), so they survive the tab and show on the
// student picker.
//
// `studentKey` is the assisted session's studentId, or the literal string
// 'self' for a pupil's own non-assisted session — using a fixed 'self' rather
// than the pupil's own profile id sidesteps a timing issue (the profile hasn't
// necessarily loaded the moment the session page first mounts) and is safe in
// practice since a non-assisted session is always one pupil on their own login
// in their own tab.
//
// sessionStorage (not localStorage) is deliberate: it survives a reload but
// clears when the tab is closed, so nobody ends up stuck re-reading a
// months-old passage. It is also per browser tab, so a passage generated here
// is not visible from another computer.
import type { Lang } from '../../../components/buttons/LangToggle.tsx'
import type { Passage } from './assessment_session/assessmentSessionStrings.ts'

const PASSAGE_CACHE_PREFIX = 'bq_passage_cache:'

function passageCacheKey(lang: Lang, studentKey: string): string {
    return `${PASSAGE_CACHE_PREFIX}${lang}:${studentKey}`
}

// `approved` is false while an assisted session's passage is still waiting
// for the teacher's read-through (the 'review' step), so a reload lands back
// on that step; a cache entry written before this existed counts as approved.
export type CachedPassage = Passage & { approved: boolean }

export function readCachedPassage(lang: Lang, studentKey: string): CachedPassage | null {
    try {
        const raw = sessionStorage.getItem(passageCacheKey(lang, studentKey))
        if (!raw) return null
        const parsed = JSON.parse(raw) as Partial<CachedPassage>
        if (typeof parsed?.title === 'string' && typeof parsed?.passage === 'string') {
            return { title: parsed.title, passage: parsed.passage, approved: parsed.approved !== false }
        }
        return null
    } catch {
        // Malformed JSON, or sessionStorage unavailable (private
        // browsing edge cases) — just treat it as a cache miss.
        return null
    }
}

export function writeCachedPassage(lang: Lang, studentKey: string, passage: Passage, approved: boolean): void {
    try {
        sessionStorage.setItem(passageCacheKey(lang, studentKey), JSON.stringify({ ...passage, approved }))
    } catch {
        // Storage full or unavailable — the passage still works for this
        // session, it just won't survive a reload. Not worth surfacing.
    }
}

export function clearCachedPassage(lang: Lang, studentKey: string): void {
    try {
        sessionStorage.removeItem(passageCacheKey(lang, studentKey))
    } catch {
        // see writeCachedPassage
    }
}
