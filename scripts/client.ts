// File: scripts/client.ts
import dotenv from 'dotenv'
// ENV_FILE picks which project a script talks to: unset = the local stack
// (.env.local); ENV_FILE=.env.cloud.local points the same scripts at the
// deployed Supabase project instead (see docs/DEPLOYMENT.md).
dotenv.config({ path: process.env.ENV_FILE ?? '.env.local' })

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
        'Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in your .env.local file.'
    )
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
})