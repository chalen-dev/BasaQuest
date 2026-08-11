import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in your .env.local file.'
    )
}

// "Log in as this pupil" (StudentList) opens a brand-new tab that lands on
// /student-session before anything else in the app runs. Because this file
// is a module-level singleton, a new tab means it gets re-evaluated from
// scratch in its own JS context — so we can decide, once, right here,
// whether THIS tab's client persists its session to the normal shared
// localStorage (every regular tab, unchanged) or to sessionStorage under a
// separate key (only a tab opened specifically to view a pupil's account
// as them). sessionStorage is scoped to a single tab by the browser, so a
// pupil session opened this way can never leak into or overwrite the
// teacher's own session in whatever tab they started from.
const isStudentSessionTab = window.location.pathname.startsWith('/student-session')

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        // The student-session tab redeems its token manually via
        // verifyOtp rather than Supabase's automatic URL-fragment
        // detection, so that behavior is switched off for it.
        detectSessionInUrl: !isStudentSessionTab,
        ...(isStudentSessionTab
            ? { storage: window.sessionStorage, storageKey: 'basaquest-student-session-auth' }
            : {}),
    },
})

export default supabase