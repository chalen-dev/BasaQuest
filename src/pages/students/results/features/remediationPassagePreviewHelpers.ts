// File: src/pages/students/results/features/remediationPassagePreviewHelpers.ts
//
// Plain (non-component) helpers for RemediationPassagePreview.tsx — no
// JSX in here on purpose, same reasoning as attemptResultsHelpers.ts's
// own header comment. Everything that actually calls
// generate-remediation-passages (initial batch generation, single-
// passage regenerate, and "Start Over") funnels through
// generatePassages() below, so there's exactly one place that shapes
// the request and validates the response.
import { supabase } from '../../../../lib/supabaseClient'
import type { RemediationPassage, RemediationWordEntry } from '../../remediation/hooks'

// Mirrors generate-remediation-passages/index.ts's own MAX_WORDS_PER_REQUEST
// exactly -- kept in sync by hand since an edge function (Deno, its own
// bundle) can't be imported into the client bundle. If that constant
// ever changes server-side, update this one to match.
export const MAX_WORDS_PER_REQUEST = 60

// attempt.grade_level is a frozen-at-attempt-time string (assessment_attempts
// column) — generate-remediation-passages wants a 1-6 number, same
// contract generate-passage's own gradeLevel already uses. Falls back to
// 3 (a middle-of-the-road default) if it's missing or not a clean
// number rather than blocking generation entirely — same "never let a
// secondary detail block the main flow" spirit as this whole feature's
// other fallbacks.
export function parseGradeLevel(gradeLevel: string | null): number {
    const parsed = Number(gradeLevel)
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > 6) return 3
    return Math.round(parsed)
}

type RawPassageItem = { passageWords: unknown; targetWords: unknown; targetIndices: unknown; coachTip: unknown }
// Client-side mirror of the edge function's own isValidPassageList() —
// defense in depth, same reasoning attachSentences() (AttemptResults.tsx,
// now removed) applied to generate-remediation-sentences' response
// before trusting it, even though the edge function already validates
// server-side.
function isValidPassageList(input: unknown): input is RemediationPassage[] {
    if (!Array.isArray(input) || input.length === 0) return false
    return input.every((raw) => {
        const item = raw as RawPassageItem
        if (!item || typeof item !== 'object') return false
        if (
            !Array.isArray(item.passageWords) ||
            item.passageWords.length === 0 ||
            !item.passageWords.every((w) => typeof w === 'string' && w.trim().length > 0)
        ) return false
        if (
            !Array.isArray(item.targetWords) ||
            item.targetWords.length === 0 ||
            !item.targetWords.every((w) => typeof w === 'string' && w.trim().length > 0)
        ) return false
        const wordCount = (item.passageWords as string[]).length
        if (
            !Array.isArray(item.targetIndices) ||
            item.targetIndices.length === 0 ||
            !item.targetIndices.every((i) => Number.isInteger(i) && i >= 0 && i < wordCount)
        ) return false
        return typeof item.coachTip === 'string' && item.coachTip.trim().length > 0
    })
}

// Calls generate-remediation-passages for exactly the given word list —
// used both for the initial batch generation/"Start Over" (the full
// capped weak-word list) and for regenerating a single passage (just
// that passage's own targetWords, so its own regenerated replacement
// still covers the same words it did before). Returns null on any
// failure (network, malformed response, Gemini error) rather than
// throwing, so the caller can show its own error state without a
// try/catch at every call site.
export async function generatePassages(
    words: string[],
    language: 'en' | 'fil',
    gradeLevel: number
): Promise<RemediationPassage[] | null> {
    try {
        const { data, error } = await supabase.functions.invoke('generate-remediation-passages', {
            body: { words, language, gradeLevel },
        })
        if (error || !isValidPassageList(data)) {
            console.error('RemediationPassagePreview: generate-remediation-passages failed', error)
            return null
        }
        return data
    } catch (err) {
        console.error('RemediationPassagePreview: generate-remediation-passages threw', err)
        return null
    }
}

// Regenerates ONE passage in place -- reuses generatePassages() scoped
// to that passage's own targetWords, taking the first (only) result.
export async function regeneratePassage(
    passage: RemediationPassage,
    language: 'en' | 'fil',
    gradeLevel: number
): Promise<RemediationPassage | null> {
    const result = await generatePassages(passage.targetWords, language, gradeLevel)
    return result?.[0] ?? null
}

// Which of the material's weak words aren't a target of ANY currently-
// kept passage — naturally includes both words Gemini failed to place
// anywhere and words that never got sent at all (the >MAX_WORDS_PER_REQUEST
// overflow), since neither ever lands in any passage's targetWords.
// Recomputed after every generation/discard/regenerate rather than
// tracked incrementally, since the input is always small (at most
// MAX_WORDS_PER_REQUEST entries).
export function computeCoverageGap(allEntries: RemediationWordEntry[], passages: RemediationPassage[]): RemediationWordEntry[] {
    const covered = new Set(passages.flatMap((p) => p.targetWords.map((w) => w.toLowerCase())))
    return allEntries.filter((entry) => !covered.has(entry.word.toLowerCase()))
}
