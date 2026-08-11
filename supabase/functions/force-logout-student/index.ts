// File: supabase/functions/force-logout-student/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }
    try {
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) return json({ error: 'Missing Authorization header.' }, 401)

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

        const callerClient = createClient(supabaseUrl, anonKey, {
            global: { headers: { Authorization: authHeader } },
        })
        const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser()
        if (callerErr || !caller) return json({ error: 'Not authenticated.' }, 401)

        const { data: callerProfile, error: callerProfileErr } = await callerClient
            .from('profiles').select('id, role').eq('id', caller.id).single()
        if (callerProfileErr || !callerProfile || callerProfile.role !== 'teacher') {
            return json({ error: 'Only teacher accounts can force-logout pupil accounts.' }, 403)
        }

        const body = await req.json()
        const studentId = String(body.id ?? '').trim()
        // Whether the teacher's own presence subscription currently shows
        // this pupil as online — trusted as a hint, not re-verified
        // server-side, since the worst case of a wrong guess is just an
        // unnecessary ban (recoverable via "Enable account") or a
        // broadcast nobody's listening for (harmless no-op).
        const online = Boolean(body.online)
        if (!studentId) return json({ error: 'Missing student id.' }, 400)

        const adminClient = createClient(supabaseUrl, serviceRoleKey)
        const { data: target, error: targetErr } = await adminClient
            .from('profiles')
            .select('id, teacher_id, role')
            .eq('id', studentId)
            .single()
        if (targetErr || !target) return json({ error: 'Student not found.' }, 404)
        if (target.role !== 'student' || target.teacher_id !== callerProfile.id) {
            return json({ error: 'You can only force-logout your own pupils.' }, 403)
        }

        // Always broadcast the kick — if the pupil's tab is open and
        // listening, this is instant and is what makes them see the
        // popup. If nobody's listening, it's a harmless no-op.
        await broadcastKick(supabaseUrl, serviceRoleKey, callerProfile.id, studentId)

        if (online) {
            // Reachable live — the broadcast alone is enough to end their
            // session, so they aren't locked out of logging back in.
            return json({ success: true, banned: false }, 200)
        }

        // Not confirmed online — same ban_duration mechanism as
        // toggle-student-status, so "force logout" is guaranteed to
        // actually terminate access even if we couldn't reach a live tab.
        // The teacher can re-enable once they're satisfied.
        const { error: banErr } = await adminClient.auth.admin.updateUserById(studentId, {
            ban_duration: '876000h',
        })
        if (banErr) return json({ error: banErr.message }, 400)

        const { data: profile, error: updateErr } = await adminClient
            .from('profiles')
            .update({ is_disabled: true })
            .eq('id', studentId)
            .select('id, username, full_name, role, grade_level, section, teacher_id, is_non_reader, is_disabled')
            .single()
        if (updateErr) return json({ error: updateErr.message }, 400)

        return json({ success: true, banned: true, profile }, 200)
    } catch (e) {
        return json({ error: e instanceof Error ? e.message : 'Unexpected error.' }, 500)
    }
})

async function broadcastKick(supabaseUrl: string, serviceRoleKey: string, teacherId: string, studentId: string) {
    try {
        const res = await fetch(`${supabaseUrl}/realtime/v1/api/broadcast`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${serviceRoleKey}`,
                apikey: serviceRoleKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messages: [
                    { topic: `teacher-presence-${teacherId}`, event: 'kicked', payload: { studentId } },
                ],
            }),
        })
        if (!res.ok) {
            console.error('force-logout-student: broadcast failed', res.status, await res.text())
        }
    } catch (err) {
        console.error('force-logout-student: broadcast threw', err)
    }
}

function json(body: unknown, status: number) {
    return new Response(JSON.stringify(body), {
        status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
}