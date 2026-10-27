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
    // True when scoring ran but ended in status 'failed' (the recording itself
    // is saved), so the pupil can be told instead of shown a plain success.
    scoringFailed: boolean
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
// Defensive-only: the scoring service's own /score/:attemptId handler now
// bounds itself with a duration-aware timeout on the actual Azure call
// (see basaquest-scoring's azureAssess.js/index.js) rather than being able
// to hang forever on a stalled Azure connection, so under normal operation
// this fetch should always get a real response well before this fires.
// This is purely a last-resort net for the fetch ITSELF never coming back
// (a dropped connection with no clean close) — sized comfortably above the
// backend's own worst-case timeout so the backend's real error response
// (if any) always has a chance to arrive first. Falls back to a flat
// 60-second assumed duration when the caller doesn't know it (useRetryScoring
// doesn't track the original take's length) — harmless either way since the
// backend re-measures the actual audio's duration itself regardless of what
// this client-side estimate assumes.
function scoringFetchTimeoutMs(durationSeconds: number | undefined): number {
    return Math.max(30_000, (durationSeconds ?? 60) * 3000) + 30_000
}
async function runScoring(attemptId: string, language: Lang, passageText: string, durationSeconds?: number): Promise<void> {
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
    // NOTE: despite how this used to read, the scoring service's
    // /score/:attemptId handler is NOT fire-and-forget — it awaits the
    // entire pipeline (download, transcode, the Azure call, alignment, the
    // word-row + status writes) before responding, so this fetch stays
    // pending for the whole scoring run, not just until it's "kicked off".
    // That's why the pupil-facing submit flow can take a while for a long
    // recording; see scoringFetchTimeoutMs's comment for how that's now
    // bounded instead of able to hang indefinitely.
    const timeoutMs = scoringFetchTimeoutMs(durationSeconds)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
    try {
        const res = await fetch(`${SCORING_SERVICE_URL}/score/${attemptId}`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}` },
            signal: controller.signal,
        })
        if (!res.ok) {
            const detail = await res.text().catch(() => '')
            console.error(`useSubmitAttempt: scoring request failed (${res.status})`, detail)
            await markAttemptFailed(attemptId, `Scoring request failed (${res.status}).`)
        }
        // On success, the word rows + status: 'scored' were already
        // written by the time this response arrived (see the NOTE above).
    } catch (err) {
        const timedOut = err instanceof DOMException && err.name === 'AbortError'
        console.error('useSubmitAttempt: scoring request threw', err)
        await markAttemptFailed(
            attemptId,
            timedOut ? `Scoring request timed out after ${Math.round(timeoutMs / 1000)}s with no response.` : err instanceof Error ? err.message : 'Scoring request failed.'
        )
    } finally {
        clearTimeout(timeoutId)
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
            await runScoring(attemptId, args.language, args.passageText, args.durationSeconds)
            const { data: after } = await supabase.from('assessment_attempts').select('status').eq('id', attemptId).maybeSingle()
            return { attemptId, scoringFailed: after?.status === 'failed' }
        },
    })
}

// Re-runs scoring for an attempt that already landed on status='failed'
// (see markAttemptFailed / runScoring above) — used by
// AssessmentSession.tsx's "Try Again" button on the inline scoring-failed
// card, instead of forcing the teacher to throw away a perfectly good
// recording and start a brand new attempt. Resets status back to
// 'pending' (the real scoring service moves it to 'processing' itself; so useAttemptQuery's poll — see students/review/hooks.ts —
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
                // 'pending', not 'processing': the scoring service marks the
                // attempt 'processing' itself and answers 409 if it already is.
                .update({ status: 'pending', error_message: null })
                .eq('id', attemptId)
            if (resetError) {
                throw new Error(`Failed to reset attempt status: ${resetError.message}`)
            }
            await runScoring(attemptId, language, passageText)
        },
    })
}