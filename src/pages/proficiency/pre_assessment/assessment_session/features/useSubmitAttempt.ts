// File: useSubmitAttempt.ts
// File: src/pages/proficiency/pre_assessment/assessment_session/features/useSubmitAttempt.ts
// Uploads a finished take to Storage, creates its assessment_attempts row,
// and (English only, for now) kicks off scoring on the basaquest-scoring
// service — the three things AssessmentSession.tsx's old handleSubmit
// stub never actually did (see that file's header comment history).
//
// The attempt's id is generated CLIENT-SIDE (crypto.randomUUID()) before
// either the upload or the insert happen, rather than letting Postgres's
// gen_random_uuid() default assign one on insert. That's because the
// audio_path column is NOT NULL and has to be set on the very insert that
// creates the row — but the upload needs a path ahead of time, and the
// migration's own comment already documents the intended shape
// ("<student_id>/<attempt_id>.webm"). Generating the id first lets both
// the storage path and the row's own id agree, matching that convention
// exactly instead of inventing a separate random filename.
//
// SCORING FAILURE HANDLING: runScoring() below is the one place that
// decides an attempt has moved on from upload+insert into "actually try
// to get it scored" — and it NEVER lets a failure disappear silently.
// Every branch (placeholder throws, the real POST comes back non-2xx,
// no session, no VITE_SCORING_SERVICE_URL configured) ends by writing
// status: 'failed' + error_message onto the attempt row via
// markAttemptFailed(). Before this, a failed scoring attempt was left at
// whatever status the insert defaulted to (effectively 'pending')
// forever — AssessmentSession.tsx's inline poll would just show its
// "Scoring the Reading" spinner indefinitely with no way out, and the
// standalone review queue (status = 'scored' only) would never surface
// it at all. useRetryScoring (below) is the matching undo: re-run
// scoring for an already-failed attempt without throwing away the
// recording and starting over.
//
// Deliberately does NOT throw out of the outer mutation if the scoring
// step itself fails after the attempt row + audio are already saved —
// those are the two things that actually need to succeed for the pupil
// to see "submitted". A failed scoring attempt is now visible (status:
// 'failed') and retryable, which is different from "the submission
// itself failed."
//
// When USE_PLACEHOLDER_SCORING (root devFlags.ts) is on, the real
// basaquest-scoring call below is skipped entirely and fake-but-plausible
// scored data is written directly instead, via applyPlaceholderScoring()
// (placeholderScoring.ts) — same idea as USE_PLACEHOLDER_PASSAGE, just
// for Azure credits instead of Gemini's.
import { useMutation } from '@tanstack/react-query'
import { supabase } from '../../../../../lib/supabaseClient.ts'
import type { Lang } from '../../../../../components/buttons/LangToggle.tsx'
import { USE_PLACEHOLDER_SCORING } from '../../../../../../devFlags.ts'
import { applyPlaceholderScoring } from './placeholderScoring.ts'

const RECORDINGS_BUCKET = 'assessment-recordings'
const SCORING_SERVICE_URL = import.meta.env.VITE_SCORING_SERVICE_URL as string | undefined

export type SubmitAttemptArgs = {
    studentId: string
    teacherId: string | null
    language: Lang
    passageTitle: string | null
    passageText: string
    gradeLevel: number | null
    blob: Blob
    durationSeconds: number
}

export type SubmitAttemptResult = {
    attemptId: string
}

function extensionFor(blob: Blob): string {
    if (blob.type.includes('webm')) return 'webm'
    if (blob.type.includes('ogg')) return 'ogg'
    if (blob.type.includes('mp4')) return 'mp4'
    return 'dat'
}

// Marks an attempt permanently failed so pollers (AssessmentSession.tsx's
// inline review today; eventually a "failed" filter on the standalone
// review lists) can stop waiting on something that's never going to
// reach 'scored' on its own. Swallows its own error deliberately — this
// IS the failure-handling path, there's nowhere further to report a
// failure of *that* to beyond a console.error.
async function markAttemptFailed(attemptId: string, message: string) {
    const { error } = await supabase
        .from('assessment_attempts')
        .update({ status: 'failed', error_message: message })
        .eq('id', attemptId)
    if (error) {
        console.error('useSubmitAttempt: failed to mark attempt as failed', error)
    }
}

// The actual "run scoring for this attempt" step, split out from the
// upload+insert above it so both the initial submit AND useRetryScoring
// (below) call the exact same logic instead of two implementations
// quietly drifting apart. Never throws — every failure path here ends
// in markAttemptFailed so the row always lands somewhere a poller can
// see, rather than sitting at its prior status forever.
async function runScoring(attemptId: string, language: Lang, passageText: string): Promise<void> {
    // Only English has a scoring pipeline wired up (Azure Pronunciation
    // Assessment via basaquest-scoring) — the service itself also
    // rejects non-English attempts, but skipping the call entirely here
    // avoids a guaranteed 400 and a pointless round trip. The row stays
    // 'pending'; there's no Filipino scoring path yet (planned
    // separately, once the Filipino miscue-detection model is trained).
    if (language !== 'en') {
        return
    }
    if (USE_PLACEHOLDER_SCORING) {
        try {
            await applyPlaceholderScoring(attemptId, passageText)
        } catch (err) {
            console.error('useSubmitAttempt: placeholder scoring failed', err)
            await markAttemptFailed(attemptId, err instanceof Error ? err.message : 'Placeholder scoring failed.')
        }
        return
    }
    if (!SCORING_SERVICE_URL) {
        console.error('useSubmitAttempt: VITE_SCORING_SERVICE_URL is not set — skipping the scoring request.')
        await markAttemptFailed(attemptId, 'Scoring service is not configured.')
        return
    }
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token
    if (!accessToken) {
        console.error('useSubmitAttempt: no active session — skipping the scoring request.')
        await markAttemptFailed(attemptId, 'No active session.')
        return
    }
    try {
        const res = await fetch(`${SCORING_SERVICE_URL}/score/${attemptId}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}` },
        })
        if (!res.ok) {
            const detail = await res.text().catch(() => '')
            console.error(`useSubmitAttempt: scoring request failed (${res.status})`, detail)
            await markAttemptFailed(attemptId, `Scoring request failed (${res.status}).`)
        }
        // On success, the basaquest-scoring service itself is
        // responsible for writing the word rows and flipping status to
        // 'scored' asynchronously from here — this POST only kicks it
        // off, it doesn't wait for scoring to finish.
    } catch (err) {
        console.error('useSubmitAttempt: scoring request threw', err)
        await markAttemptFailed(attemptId, err instanceof Error ? err.message : 'Scoring request failed.')
    }
}

export function useSubmitAttempt() {
    return useMutation({
        mutationFn: async (args: SubmitAttemptArgs): Promise<SubmitAttemptResult> => {
            const attemptId = crypto.randomUUID()
            const audioPath = `${args.studentId}/${attemptId}.${extensionFor(args.blob)}`
            const { error: uploadError } = await supabase.storage
                .from(RECORDINGS_BUCKET)
                .upload(audioPath, args.blob, {
                    contentType: args.blob.type || 'audio/webm',
                    upsert: false,
                })
            if (uploadError) {
                throw new Error(`Failed to upload recording: ${uploadError.message}`)
            }
            const { error: insertError } = await supabase.from('assessment_attempts').insert({
                id: attemptId,
                student_id: args.studentId,
                teacher_id: args.teacherId,
                language: args.language,
                passage_title: args.passageTitle,
                passage_text: args.passageText,
                grade_level: args.gradeLevel != null ? String(args.gradeLevel) : null,
                audio_path: audioPath,
                duration_seconds: args.durationSeconds,
            })
            if (insertError) {
                throw new Error(`Failed to create attempt: ${insertError.message}`)
            }
            await runScoring(attemptId, args.language, args.passageText)
            return { attemptId }
        },
    })
}

// Re-runs scoring for an attempt that already landed on status='failed'
// (see markAttemptFailed / runScoring above) — used by
// AssessmentSession.tsx's "Try Again" button on the inline scoring-failed
// card, instead of forcing the teacher to throw away a perfectly good
// recording and start a brand new attempt. Resets status back to
// 'processing' (so useAttemptQuery's poll — see students/review/hooks.ts —
// picks back up) and clears error_message before re-running, and — since
// applyPlaceholderScoring unconditionally inserts a fresh set of word
// rows — first deletes whatever word rows the failed attempt might
// already have (a mid-way failure could have written some before
// throwing).
export type RetryScoringArgs = {
    attemptId: string
    language: Lang
    passageText: string
}
export function useRetryScoring() {
    return useMutation({
        mutationFn: async ({ attemptId, language, passageText }: RetryScoringArgs): Promise<void> => {
            const { error: deleteWordsError } = await supabase
                .from('assessment_attempt_words')
                .delete()
                .eq('attempt_id', attemptId)
            if (deleteWordsError) {
                throw new Error(`Failed to clear previous word data: ${deleteWordsError.message}`)
            }
            const { error: resetError } = await supabase
                .from('assessment_attempts')
                .update({ status: 'processing', error_message: null })
                .eq('id', attemptId)
            if (resetError) {
                throw new Error(`Failed to reset attempt status: ${resetError.message}`)
            }
            await runScoring(attemptId, language, passageText)
        },
    })
}