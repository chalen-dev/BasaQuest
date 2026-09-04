// File: supabase/functions/purge-expired-recordings/index.ts
//
// Called once a day by the pg_cron job in
// 20260903120000_add_recording_purge_cron.sql. Not user-invoked (no JWT
// to verify — see verify_jwt = false for this function in config.toml),
// so it's guarded by a shared secret (CRON_SECRET, set via
// `supabase secrets set`) sent as the x-cron-secret header instead.
//
// Finds every assessment_attempts row whose purge_after has passed and
// still has a recording, deletes the actual file from the
// assessment-recordings bucket, then nulls audio_path — the same two
// things useSubmitReviewMutation used to do immediately on confirm (see
// review/hooks.ts), just moved here and re-anchored to purge_after
// (= created_at + 7 days, set once at insert and never touched by
// review/reopen) instead of "the moment a teacher confirms."
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
const RECORDINGS_BUCKET = 'assessment-recordings'
Deno.serve(async (req) => {
    try {
        const cronSecret = Deno.env.get('CRON_SECRET')
        if (!cronSecret) {
            console.error('purge-expired-recordings: CRON_SECRET is not configured')
            return json({ error: 'Server is not configured for this job yet.' }, 500)
        }
        if (req.headers.get('x-cron-secret') !== cronSecret) {
            return json({ error: 'Unauthorized' }, 401)
        }
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const adminClient = createClient(supabaseUrl, serviceRoleKey)
        const nowIso = new Date().toISOString()
        // Capped at 500/run — plenty for this app's scale, and keeps a
        // single run bounded if the job were ever down for a while.
        const { data: expired, error: fetchErr } = await adminClient
            .from('assessment_attempts')
            .select('id, audio_path')
            .lt('purge_after', nowIso)
            .not('audio_path', 'is', null)
            .limit(500)
        if (fetchErr) {
            console.error('purge-expired-recordings: failed to query expired attempts', fetchErr)
            return json({ error: fetchErr.message }, 500)
        }
        if (!expired || expired.length === 0) {
            return json({ purged: 0 }, 200)
        }
        const paths = expired.map((a) => a.audio_path).filter((p): p is string => !!p)
        if (paths.length > 0) {
            const { error: removeErr } = await adminClient.storage.from(RECORDINGS_BUCKET).remove(paths)
            if (removeErr) {
                // Best-effort, matching useSubmitReviewMutation's own
                // pattern — still null audio_path below either way, so
                // the app stops referencing files that are gone or
                // unreachable regardless of why the storage call failed.
                console.error('purge-expired-recordings: failed to remove some storage objects', removeErr)
            }
        }
        const ids = expired.map((a) => a.id)
        const { error: updateErr } = await adminClient
            .from('assessment_attempts')
            .update({ audio_path: null })
            .in('id', ids)
        if (updateErr) {
            console.error('purge-expired-recordings: failed to null audio_path', updateErr)
            return json({ error: updateErr.message }, 500)
        }
        console.log(`purge-expired-recordings: purged ${ids.length} attempt(s)`)
        return json({ purged: ids.length }, 200)
    } catch (e) {
        console.error('purge-expired-recordings: unexpected error', e)
        return json({ error: e instanceof Error ? e.message : 'Unexpected error.' }, 500)
    }
})
function json(body: unknown, status: number) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    })
}