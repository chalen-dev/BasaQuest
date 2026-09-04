// File: scripts/seed/assessment_attempts.seeder.ts
//
// Seeds demo rows into assessment_attempts + assessment_attempt_words so
// the teacher-facing "Pending Review" list (ReviewList.tsx, driven by
// usePendingReviewAttemptsQuery) and "Results" list (ResultsList.tsx,
// driven by useReviewedAttemptsQuery) both have data out of the box —
// each with a REAL recording uploaded to the assessment-recordings
// bucket (public/placeholder/Recording.webm), so the audio player on
// ResultsSummaryCard actually has something to play instead of a dead
// signed-URL for a path nothing backs.
//
// PLACEHOLDER FORMAT (webm/opus, not m4a/AAC): the file used to be an
// .m4a — bytes uploaded and served correctly (verified byte-identical
// end to end), but it hit MEDIA_ERR_SRC_NOT_SUPPORTED in at least one
// real browser/OS combo despite being valid AAC-LC, almost certainly an
// OS-level AAC codec gap (Windows Media Feature Pack and similar). Real
// student recordings (useSubmitAttempt.ts) are always webm/opus straight
// out of MediaRecorder and never had this problem, so the placeholder
// now uses the same format instead of chasing platform-specific AAC
// support — see AudioPlayer.tsx's newly-added onError handler if a
// codec issue like this ever needs diagnosing again.
//
// Reuses the exact same per-word fabrication approach as
// placeholderScoring.ts (src/pages/proficiency/pre_assessment/
// assessment_session/features/placeholderScoring.ts) — same weighting,
// same shape — just duplicated here rather than imported, since that
// file imports the browser supabase client (auth-bound), while seed
// scripts must use the service_role client from scripts/client.ts.
//
// AUDIO PRESENCE now follows the same rule the real app follows since
// the purge-expired-recordings change (see
// supabase/migrations/20260903120000_add_recording_purge_cron.sql and
// review/hooks.ts's useSubmitReviewMutation): a recording sticks around
// until purge_after (created_at + 7 days), REGARDLESS of whether the
// attempt has been reviewed — reviewing no longer deletes it early. So
// audio_path is only set here when purge_after is still in the future
// relative to "now" at seed time; older seeded attempts (reviewed ones
// backdated far enough) are left with audio_path: null, same as if the
// real purge job had already run on them. This is deliberately NOT
// "reviewed => no audio" like the old version of this file assumed —
// that assumption stopped being true once review confirmation stopped
// touching audio_path at all.
//
// Idempotent: every seeded attempt's passage_title is prefixed with
// "[Seed] " (mirroring the "[Placeholder] " convention already used by
// PLACEHOLDER_PASSAGES), and on each run we first delete any previously
// seeded attempts (and their words, via ON DELETE CASCADE) for these
// students, AND clear out anything already sitting in their storage
// folders, before inserting/uploading fresh ones — so re-running this
// seeder (e.g. via db:fresh, or just `npm run seed` on its own) doesn't
// pile up duplicate rows or orphaned recordings under old attempt ids.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { supabase } from '../client.ts'
const SEED_TITLE_PREFIX = '[Seed] '
const RECORDINGS_BUCKET = 'assessment-recordings'
const __dirname = dirname(fileURLToPath(import.meta.url))
const PLACEHOLDER_RECORDING_PATH = join(__dirname, '../../public/placeholder/Recording.webm')
type FakeErrorType = 'None' | 'Omission' | 'Mispronunciation'
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
function pickConfidence(errorType: FakeErrorType): 'high' | 'low' {
    if (errorType === 'None') return Math.random() < 0.1 ? 'low' : 'high'
    return Math.random() < 0.6 ? 'low' : 'high'
}
function fakeRecognizedWord(referenceWord: string, errorType: FakeErrorType): string | null {
    if (errorType === 'None') return referenceWord
    if (errorType === 'Omission') return null
    if (referenceWord.length <= 2) return referenceWord.split('').reverse().join('')
    const mid = Math.floor(referenceWord.length / 2)
    return referenceWord.slice(0, mid) + referenceWord.slice(mid + 1)
}
function fakeWordAccuracyScore(errorType: FakeErrorType): number {
    if (errorType === 'None') return Math.round(85 + Math.random() * 15)
    if (errorType === 'Mispronunciation') return Math.round(30 + Math.random() * 40)
    return Math.round(Math.random() * 20)
}
function fakeUtteranceScore(): number {
    return Math.round(70 + Math.random() * 30)
}
// Same two passages the review/assessment screens already use as
// placeholder content (PLACEHOLDER_PASSAGES in assessmentSessionStrings.ts),
// duplicated here rather than imported so this seeder has no dependency
// on src/ at all — matches how the other seeders (students.seeder.ts,
// sentences.seeder.ts) are self-contained.
const SEED_PASSAGES: Record<'en' | 'fil', { title: string; text: string }> = {
    fil: {
        title: 'Ang Munting Ibon sa Malaking Gubat',
        text: `Noong unang panahon, sa gitna ng isang malaking gubat, may nakatirang munting ibon na ang pangalan ay Maya. Maliit lamang si Maya kumpara sa ibang ibon, ngunit siya ay may malakas na loob at mabuting puso. Araw-araw, lumilipad si Maya mula sa isang sanga patungo sa iba pang sanga, hinahanap ang pinakamasarap na buto at prutas para sa kanyang pamilya.
Isang araw, habang naglalakbay si Maya patungo sa ilog upang uminom ng tubig, narinig niya ang malakas na iyak. Sinundan niya ang tunog at natagpuan niya ang isang munting kuneho na nasilo ang paa sa gitna ng mga sanga. Hindi umatras si Maya kahit siya ay maliit lamang. Tinawag niya ang kanyang mga kaibigang ibon upang tumulong. Magkasama, tinulungan nila ang kuneho na makalaya mula sa bitag.
Mula noon, naging matalik na magkaibigan sina Maya at ang kuneho. Palagi silang magkasama, naglalaro sa ilalim ng malalaking puno at nagkukuwentuhan tuwing gabi bago sumapit ang dilim. Natutunan ni Maya na ang laki ng katawan ay hindi sukatan ng lakas ng loob — ang tunay na kabayanihan ay nanggagaling sa puso.`,
    },
    en: {
        title: 'The Little Bird of the Great Forest',
        text: `Long ago, deep within a great forest, there lived a small bird named Maya. She was tiny compared to the other birds, but she had a brave heart and a kind spirit. Every day, Maya flew from branch to branch, searching for the sweetest seeds and berries to share with her family.
One morning, while Maya was making her way to the river for a drink of water, she heard a loud cry for help. She followed the sound and found a little rabbit whose paw was caught among some tangled branches. Even though she was small, Maya did not turn away. She called out to her bird friends, and together they worked to free the rabbit from the branches.
From that day on, Maya and the rabbit became the best of friends. They spent their afternoons playing beneath the tall trees and telling each other stories every evening before the sky grew dark. Maya learned an important lesson that day: the size of one's body has nothing to do with the size of one's courage. True bravery comes from the heart.`,
    },
}
function buildFakeWordRows(attemptId: string, passageText: string) {
    const words = passageText.split(/\s+/).map((w) => w.trim()).filter((w) => w.length > 0)
    return words.map((word, i) => {
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
}
function daysAgoIso(days: number): string {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}
async function clearSeededRecordings(studentIds: string[]) {
    for (const studentId of studentIds) {
        const { data: existing, error: listError } = await supabase.storage.from(RECORDINGS_BUCKET).list(studentId)
        if (listError) {
            console.error(`  ✗ couldn't list existing recordings for ${studentId}: ${listError.message}`)
            continue
        }
        if (!existing || existing.length === 0) continue
        const paths = existing.map((f) => `${studentId}/${f.name}`)
        const { error: removeError } = await supabase.storage.from(RECORDINGS_BUCKET).remove(paths)
        if (removeError) {
            console.error(`  ✗ couldn't clear old recordings for ${studentId}: ${removeError.message}`)
        }
    }
}
// Wrapped in a Blob rather than handed to .upload() as a raw Buffer —
// supabase-js branches on body type internally: a Blob/File body goes out
// as multipart/form-data (the exact path the browser's real upload in
// useSubmitAttempt.ts takes with its MediaRecorder Blob), while a bare
// Buffer instead gets POSTed as a raw body with a plain Content-Type
// header, a genuinely different code path server-side. Confirmed via a
// throwaway fetch-spy that these produce different requests; matching the
// Blob path here is what makes a seeded recording upload identically to
// one a real student's browser would send, instead of merely resulting
// in byte-identical stored content.
async function uploadPlaceholderRecording(studentId: string, attemptId: string, fileBuffer: Buffer): Promise<string | null> {
    const path = `${studentId}/${attemptId}.webm`
    const blob = new Blob([fileBuffer], { type: 'audio/webm' })
    const { error } = await supabase.storage.from(RECORDINGS_BUCKET).upload(path, blob, {
        contentType: 'audio/webm',
        upsert: true,
    })
    if (error) {
        console.error(`  ✗ failed to upload placeholder recording to ${path}: ${error.message}`)
        return null
    }
    return path
}
export async function seedAssessmentAttempts() {
    console.log('Seeding assessment attempts...')
    let placeholderRecording: Buffer | null = null
    try {
        placeholderRecording = readFileSync(PLACEHOLDER_RECORDING_PATH)
    } catch (err) {
        console.error(
            `  ✗ couldn't read placeholder recording at ${PLACEHOLDER_RECORDING_PATH} (${err instanceof Error ? err.message : err}) — seeded attempts will have no audio.`
        )
    }
    const { data: teacher, error: teacherError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', 'guro')
        .single()
    if (teacherError || !teacher) {
        console.error(`  ✗ couldn't find teacher "guro": ${teacherError?.message ?? 'not found'} — seed users first`)
        return
    }
    const { data: students, error: studentsError } = await supabase
        .from('profiles')
        .select('id, username, grade_level')
        .eq('teacher_id', teacher.id)
        .eq('role', 'student')
        .order('username', { ascending: true })
    if (studentsError) {
        console.error(`  ✗ couldn't look up ${teacher.id}'s students: ${studentsError.message}`)
        return
    }
    if (!students || students.length === 0) {
        console.error('  ✗ no students found under "guro" — seed students first')
        return
    }
    const studentIds = students.map((s) => s.id)
    // Clean up any attempts (and their recordings) this seeder created on
    // a previous run, so re-running doesn't pile up duplicate rows or
    // orphaned files under stale attempt ids (each re-run generates new
    // attempt ids, so old uploaded paths would otherwise never get
    // cleaned up by anything — clear-storage.ts only runs before a full
    // db:fresh, not before a standalone `npm run seed`).
    const { error: cleanupError } = await supabase
        .from('assessment_attempts')
        .delete()
        .in('student_id', studentIds)
        .like('passage_title', `${SEED_TITLE_PREFIX}%`)
    if (cleanupError) {
        console.error(`  ✗ couldn't clear previously seeded attempts: ${cleanupError.message}`)
        return
    }
    await clearSeededRecordings(studentIds)
    // Every 3rd student gets a pending-review attempt, every 3rd-plus-1
    // gets an already-reviewed one, the rest are left with none — gives
    // both lists a realistic, non-uniform amount of demo data (and with
    // 24 demo students, enough of each to exceed one page at
    // REVIEW_PAGE_SIZE = 8, so pagination has something to show too).
    let pendingCount = 0
    let reviewedCount = 0
    let withAudioCount = 0
    for (let i = 0; i < students.length; i++) {
        const student = students[i]
        const bucket = i % 3
        if (bucket === 2) continue // no attempt for this student
        const language: 'en' | 'fil' = i % 2 === 0 ? 'en' : 'fil'
        const passage = SEED_PASSAGES[language]
        const isReviewed = bucket === 1
        // Pending attempts: created 0-3 days ago. Reviewed attempts:
        // created 4-9 days ago (reviewed a couple days after creation —
        // see reviewed_at below). Deliberately spans across the 7-day
        // purge_after boundary so both "recording still there" and
        // "already purged" reviewed attempts show up in the seeded data.
        const createdDaysAgo = isReviewed ? 4 + (i % 6) : (i % 4)
        const gradeLevel = student.grade_level != null ? String(student.grade_level) : null
        // Matches the real purge-expired-recordings rule: audio survives
        // until purge_after (created_at + 7 days), whether reviewed or
        // not. Only actually upload/keep a path when it hasn't "expired"
        // yet relative to now.
        const stillHasAudio = createdDaysAgo < 7
        const attemptInsert = {
            student_id: student.id,
            teacher_id: teacher.id,
            language,
            passage_title: `${SEED_TITLE_PREFIX}${passage.title}`,
            passage_text: passage.text,
            grade_level: gradeLevel,
            // audio_path is NOT NULL at the DB level, so a not-yet-purged
            // attempt gets a REAL uploaded object below; a "purged"
            // (or upload-failed) one falls back to a placeholder string
            // that doesn't point at any real file — matching how an
            // already-purged real attempt looks (null) as closely as the
            // NOT NULL constraint allows for the "no audio yet uploaded"
            // fallback case.
            audio_path: `seed/${student.username}-pending-upload.wav`,
            duration_seconds: Math.round(30 + Math.random() * 60),
            status: 'scored' as const,
            accuracy_score: fakeUtteranceScore(),
            fluency_score: fakeUtteranceScore(),
            prosody_score: fakeUtteranceScore(),
            completeness_score: fakeUtteranceScore(),
            pron_score: fakeUtteranceScore(),
            created_at: daysAgoIso(createdDaysAgo),
            scored_at: daysAgoIso(createdDaysAgo),
            reviewed_at: isReviewed ? daysAgoIso(Math.max(0, createdDaysAgo - 2)) : null,
            reviewed_by: isReviewed ? teacher.id : null,
            purge_after: daysAgoIso(createdDaysAgo - 7), // 7 days after created_at
        }
        const { data: attempt, error: attemptError } = await supabase
            .from('assessment_attempts')
            .insert(attemptInsert)
            .select('id')
            .single()
        if (attemptError || !attempt) {
            console.error(`  ✗ ${student.username}: ${attemptError?.message ?? 'insert failed'}`)
            continue
        }
        // Upload the real placeholder recording now that we have a real
        // attempt id to path it under, then patch audio_path to the real
        // path (or explicit null if it's meant to already look purged).
        let finalAudioPath: string | null = null
        if (stillHasAudio && placeholderRecording) {
            finalAudioPath = await uploadPlaceholderRecording(student.id, attempt.id, placeholderRecording)
            if (finalAudioPath) withAudioCount++
        }
        const { error: audioPatchError } = await supabase
            .from('assessment_attempts')
            .update({ audio_path: finalAudioPath })
            .eq('id', attempt.id)
        if (audioPatchError) {
            console.error(`  ✗ ${student.username}: attempt created but audio_path patch failed: ${audioPatchError.message}`)
        }
        const wordRows = buildFakeWordRows(attempt.id, passage.text)
        const finalWordRows = isReviewed
            ? wordRows.map((w) => ({
                ...w,
                teacher_verdict: w.system_verdict,
                teacher_reviewed_at: attemptInsert.reviewed_at,
                teacher_reviewed_by: teacher.id,
            }))
            : wordRows
        const { error: wordsError } = await supabase.from('assessment_attempt_words').insert(finalWordRows)
        if (wordsError) {
            console.error(`  ✗ ${student.username}: attempt created but words failed: ${wordsError.message}`)
            continue
        }
        if (isReviewed) reviewedCount++
        else pendingCount++
        console.log(`  ✓ ${student.username} (${isReviewed ? 'reviewed' : 'pending review'}, ${language}${finalAudioPath ? ', with audio' : ', no audio (expired)'})`)
    }
    console.log(`  → ${pendingCount} pending review, ${reviewedCount} reviewed, ${withAudioCount} with a recording attached`)
}