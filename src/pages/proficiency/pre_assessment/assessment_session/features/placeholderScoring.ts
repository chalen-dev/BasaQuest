// File: placeholderScoring.ts
// File: src/pages/proficiency/pre_assessment/assessment_session/features/placeholderScoring.ts
//
// The actual fabrication logic behind USE_PLACEHOLDER_SCORING (the
// switch itself lives in the root devFlags.ts, alongside
// USE_PLACEHOLDER_PASSAGE). When that flag is on, useSubmitAttempt.ts
// calls applyPlaceholderScoring() below instead of POSTing to
// basaquest-scoring — no Azure credits spent, no network dependency on
// that service being reachable at all.
//
// It fabricates a plausible-but-fake per-word result for every word in
// the passage (mostly correct, some miscues — see WORD_ERROR_WEIGHTS
// below) and writes it straight into assessment_attempt_words, then
// flips the attempt itself to status='scored' with fake utterance-level
// scores. Shape matches exactly what the real basaquest-scoring service
// would have written (same columns, same check-constraint values), so
// every downstream consumer (AttemptWordReview, the inline "Now" review,
// ReviewList, TeacherReviewAttempt) can't tell the difference.
//
// Deliberately never fabricates an 'Insertion' row — a real Insertion
// represents an extra word the pupil said that ISN'T in the passage,
// which doesn't have a natural place to come from when we're just
// walking the passage's own word list. Only 'None' (correct) and
// 'Omission' / 'Mispronunciation' (miscues on a real passage word) are
// generated. That's a reasonable placeholder-data gap, not a bug — flip
// USE_PLACEHOLDER_SCORING off in devFlags.ts and use the real pipeline
// if Insertion rows specifically need testing.
import { supabase } from '../../../../../lib/supabaseClient.ts'

type FakeErrorType = 'None' | 'Omission' | 'Mispronunciation'

// ~85% of words come out correct; the remaining ~15% split between the
// two miscue types this placeholder supports.
const WORD_ERROR_WEIGHTS: Array<{ type: FakeErrorType; weight: number }> = [
    { type: 'None', weight: 0.85 },
    { type: 'Omission', weight: 0.08 },
    { type: 'Mispronunciation', weight: 0.07 },
]

function pickErrorType(): FakeErrorType {
    const roll = Math.random()
    let cumulative = 0
    for (const { type, weight } of WORD_ERROR_WEIGHTS) {
        cumulative += weight
        if (roll < cumulative) return type
    }
    return 'None'
}

// Low-confidence rows are what the review UI is meant to surface — mostly
// on miscues (a real low-confidence detection is usually on a genuinely
// ambiguous word), with a small chance even on a 'None' word so the
// "review a correct-looking word anyway" case has some test coverage too.
function pickConfidence(errorType: FakeErrorType): 'high' | 'low' {
    if (errorType === 'None') {
        return Math.random() < 0.1 ? 'low' : 'high'
    }
    return Math.random() < 0.6 ? 'low' : 'high'
}

function fakeRecognizedWord(referenceWord: string, errorType: FakeErrorType): string | null {
    if (errorType === 'None') return referenceWord
    if (errorType === 'Omission') return null // nothing recognized where this word should have been
    // Mispronunciation: mangle the word slightly so it still looks like a
    // plausible ASR misfire rather than a random string.
    if (referenceWord.length <= 2) return referenceWord.split('').reverse().join('')
    const mid = Math.floor(referenceWord.length / 2)
    return referenceWord.slice(0, mid) + referenceWord.slice(mid + 1)
}

function fakeWordAccuracyScore(errorType: FakeErrorType): number {
    if (errorType === 'None') return Math.round(85 + Math.random() * 15) // 85-100
    if (errorType === 'Mispronunciation') return Math.round(30 + Math.random() * 40) // 30-70
    return Math.round(Math.random() * 20) // Omission: 0-20
}

function fakeUtteranceScore(): number {
    return Math.round(70 + Math.random() * 30) // 70-100, generically "pretty good"
}

export async function applyPlaceholderScoring(attemptId: string, passageText: string): Promise<void> {
    const words = passageText
        .split(/\s+/)
        .map((w) => w.trim())
        .filter((w) => w.length > 0)

    const wordRows = words.map((word, i) => {
        const errorType = pickErrorType()
        const confidence = pickConfidence(errorType)
        return {
            attempt_id: attemptId,
            word_index: i + 1,
            reference_word: word,
            recognized_word: fakeRecognizedWord(word, errorType),
            error_type: errorType,
            accuracy_score: fakeWordAccuracyScore(errorType),
            system_verdict: errorType === 'None' ? 'correct' : 'miscue',
            confidence,
        }
    })

    if (wordRows.length > 0) {
        const { error: wordsError } = await supabase.from('assessment_attempt_words').insert(wordRows)
        if (wordsError) {
            throw new Error(`Placeholder scoring: failed to insert fake word rows: ${wordsError.message}`)
        }
    }

    const { error: updateError } = await supabase
        .from('assessment_attempts')
        .update({
            status: 'scored',
            scored_at: new Date().toISOString(),
            accuracy_score: fakeUtteranceScore(),
            fluency_score: fakeUtteranceScore(),
            prosody_score: fakeUtteranceScore(),
            completeness_score: fakeUtteranceScore(),
            pron_score: fakeUtteranceScore(),
        })
        .eq('id', attemptId)

    if (updateError) {
        throw new Error(`Placeholder scoring: failed to mark attempt scored: ${updateError.message}`)
    }
}