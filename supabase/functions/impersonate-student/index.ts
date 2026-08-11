// File: supabase/functions/impersonate-student/index.ts
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

        // Same pattern as create-student/delete-student: verify the caller
        // via their own JWT first, only escalate to the service-role admin
        // client once we know who's asking and that they're allowed to.
        const callerClient = createClient(supabaseUrl, anonKey, {
            global: { headers: { Authorization: authHeader } },
        })
        const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser()
        if (callerErr || !caller) return json({ error: 'Not authenticated.' }, 401)

        const { data: callerProfile, error: callerProfileErr } = await callerClient
            .from('profiles').select('id, role').eq('id', caller.id).single()
        if (callerProfileErr || !callerProfile || callerProfile.role !== 'teacher') {
            return json({ error: 'Only teacher accounts can log in as a pupil.' }, 403)
        }

        const body = await req.json()
        const studentId = String(body.id ?? '').trim()
        if (!studentId) return json({ error: 'Missing student id.' }, 400)

        const adminClient = createClient(supabaseUrl, serviceRoleKey)

        // Ownership check — a teacher can only ever open a reading session
        // for a pupil actually assigned to them. Same shape as delete-student.
        const { data: target, error: targetErr } = await adminClient
            .from('profiles')
            .select('id, teacher_id, role, username, is_disabled')
            .eq('id', studentId)
            .single()
        if (targetErr || !target) return json({ error: 'Student not found.' }, 404)
        if (target.role !== 'student' || target.teacher_id !== callerProfile.id) {
            return json({ error: 'You can only log in as your own pupils.' }, 403)
        }
        if (!target.username) return json({ error: 'This pupil has no username on file.' }, 400)
        // The Auth-layer ban (set by toggle-student-status) should already
        // block this, but checking it explicitly here too means a clear,
        // specific error message instead of relying on how GoTrue happens
        // to fail an admin-generated link for a banned user.
        if (target.is_disabled) {
            return json({ error: "This pupil's account is disabled." }, 403)
        }

        const email = `${target.username}@basaquest.local`

        // A one-time magic-link token. The frontend redeems it itself via
        // verifyOtp in a fresh, isolated tab rather than following the
        // hosted action_link URL — so we don't need a Redirect URL
        // configured in the Supabase Auth dashboard for this to work.
        const { data: link, error: linkErr } = await adminClient.auth.admin.generateLink({
            type: 'magiclink',
            email,
        })
        if (linkErr || !link) {
            return json({ error: linkErr?.message ?? 'Could not start a session for this pupil.' }, 400)
        }

        return json({
            tokenHash: link.properties.hashed_token,
        }, 200)
    } catch (e) {
        return json({ error: e instanceof Error ? e.message : 'Unexpected error.' }, 500)
    }
})

function json(body: unknown, status: number) {
    return new Response(JSON.stringify(body), {
        status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
}