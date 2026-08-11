// File: supabase/functions/toggle-student-status/index.ts
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
            return json({ error: 'Only teacher accounts can disable/enable pupil accounts.' }, 403)
        }

        const body = await req.json()
        const studentId = String(body.id ?? '').trim()
        const disabled = Boolean(body.disabled)
        if (!studentId) return json({ error: 'Missing student id.' }, 400)

        const adminClient = createClient(supabaseUrl, serviceRoleKey)

        const { data: target, error: targetErr } = await adminClient
            .from('profiles')
            .select('id, teacher_id, role')
            .eq('id', studentId)
            .single()
        if (targetErr || !target) return json({ error: 'Student not found.' }, 404)
        if (target.role !== 'student' || target.teacher_id !== callerProfile.id) {
            return json({ error: 'You can only disable/enable your own pupils.' }, 403)
        }

        // Bans at the actual Auth layer — this is what really blocks
        // sign-in (password login, magic-link login, everything), not
        // just something the app's own UI happens to check. "876000h"
        // (~100 years) is Supabase's documented way to express an
        // indefinite ban; "none" clears it.
        const { error: banErr } = await adminClient.auth.admin.updateUserById(studentId, {
            ban_duration: disabled ? '876000h' : 'none',
        })
        if (banErr) return json({ error: banErr.message }, 400)

        const { data: profile, error: updateErr } = await adminClient
            .from('profiles')
            .update({ is_disabled: disabled })
            .eq('id', studentId)
            .select('id, username, full_name, role, grade_level, section, teacher_id, is_non_reader, is_disabled')
            .single()
        if (updateErr) return json({ error: updateErr.message }, 400)

        return json({ profile }, 200)
    } catch (e) {
        return json({ error: e instanceof Error ? e.message : 'Unexpected error.' }, 500)
    }
})

function json(body: unknown, status: number) {
    return new Response(JSON.stringify(body), {
        status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
}