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
// Deliberately does NOT throw if the /score call itself fails after the
// attempt row + audio are already saved — those are the two things that
// actually need to succeed for the pupil to see "submitted". A failed
// scoring call just leaves the row at its default status ('pending')
// with nothing having processed it yet; there's no retry mechanism wired
// up for that today (a follow-up admin action or cron, not built here).
import { useMutation } from '@tanstack/react-query'
import { supabase } from '../../../../../lib/supabaseClient.ts'
import type { Lang } from '../../../../../components/buttons/LangToggle.tsx'
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
            // Only English has a scoring pipeline wired up (Azure
            // Pronunciation Assessment via basaquest-scoring) — the
            // service itself also rejects non-English attempts, but
            // skipping the call entirely here avoids a guaranteed 400 and
            // a pointless round trip. The row stays 'pending'; there's no
            // Filipino scoring path yet.
            if (args.language !== 'en') {
                return { attemptId }
            }
            if (!SCORING_SERVICE_URL) {
                console.error('useSubmitAttempt: VITE_SCORING_SERVICE_URL is not set — skipping the scoring request. The attempt was still saved.')
                return { attemptId }
            }
            const { data: sessionData } = await supabase.auth.getSession()
            const accessToken = sessionData.session?.access_token
            if (!accessToken) {
                console.error('useSubmitAttempt: no active session — skipping the scoring request. The attempt was still saved.')
                return { attemptId }
            }
            try {
                const res = await fetch(`${SCORING_SERVICE_URL}/score/${attemptId}`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${accessToken}` },
                })
                if (!res.ok) {
                    const detail = await res.text().catch(() => '')
                    console.error(`useSubmitAttempt: scoring request failed (${res.status})`, detail)
                }
            } catch (err) {
                console.error('useSubmitAttempt: scoring request threw', err)
            }
            return { attemptId }
        },
    })
}