// File: supabase/functions/create-student/index.ts
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
        if (!authHeader) {
            return json({ error: 'Missing Authorization header.' }, 401)
        }

        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

        // Client scoped to the calling teacher's own JWT — used only to
        // confirm who's calling and that they're actually a teacher.
        const callerClient = createClient(supabaseUrl, anonKey, {
            global: { headers: { Authorization: authHeader } },
        })
        const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser()
        if (callerErr || !caller) {
            return json({ error: 'Not authenticated.' }, 401)
        }

        const { data: callerProfile, error: callerProfileErr } = await callerClient
            .from('profiles')
            .select('id, role')
            .eq('id', caller.id)
            .single()
        if (callerProfileErr || !callerProfile || callerProfile.role !== 'teacher') {
            return json({ error: 'Only teacher accounts can create pupil accounts.' }, 403)
        }

        const body = await req.json()
        const username = String(body.username ?? '').trim()
        const fullName = String(body.fullName ?? '').trim()
        const password = String(body.password ?? '')
        const gradeLevel = body.gradeLevel != null && body.gradeLevel !== '' ? Number(body.gradeLevel) : null
        const section = body.section ? String(body.section).trim() : null
        const isNonReader = Boolean(body.isNonReader)

        if (!username || !password) {
            return json({ error: 'Username and password are required.' }, 400)
        }
        if (password.length < 6) {
            return json({ error: 'Password must be at least 6 characters.' }, 400)
        }

        // Admin client — bypasses RLS, can create auth users directly.
        const adminClient = createClient(supabaseUrl, serviceRoleKey)

        const email = `${username}@basaquest.local`
        const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { username },
        })
        if (createErr || !created?.user) {
            const message = createErr?.message?.toLowerCase().includes('duplicate') || createErr?.message?.toLowerCase().includes('already')
                ? 'That username is already taken.'
                : (createErr?.message ?? 'Failed to create the account.')
            return json({ error: message }, 400)
        }

        // The on_auth_user_created trigger already inserted a bare profile
        // row (role defaults to 'teacher', username set from metadata).
        // Turn it into a proper pupil profile linked to this teacher.
        const { data: profile, error: updateErr } = await adminClient
            .from('profiles')
            .update({
                role: 'student',
                full_name: fullName || null,
                teacher_id: callerProfile.id,
                grade_level: gradeLevel,
                section,
                is_non_reader: isNonReader,
            })
            .eq('id', created.user.id)
            .select('id, username, full_name, role, grade_level, section, teacher_id, is_non_reader')
            .single()

        if (updateErr) {
            // Best-effort cleanup — don't leave a half-provisioned auth user behind.
            await adminClient.auth.admin.deleteUser(created.user.id)
            return json({ error: updateErr.message }, 400)
        }

        return json({ profile }, 200)
    } catch (e) {
        return json({ error: e instanceof Error ? e.message : 'Unexpected error.' }, 500)
    }
})

function json(body: unknown, status: number) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
}