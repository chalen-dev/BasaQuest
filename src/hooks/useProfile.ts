
import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'

export type Profile = {
    id: string
    username: string | null
    full_name: string | null
    role: string
    avatar_url: string | null
    grade_level: number | null
    section: string | null
    teacher_id: string | null
    is_non_reader: boolean
    // Test accounts (and their pupils) carry this tag; see npm run seed:testdata.
    is_test: boolean
}

export function useProfile() {
    const { user } = useAuth()
    // Key the effect on the id, not the user object: Supabase hands out a new
    // object whenever the tab regains focus or the token refreshes, and
    // re-fetching then would flash the loading state and remount the page.
    const userId = user?.id
    const [profile, setProfile] = useState<Profile | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!userId) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setProfile(null)
            setLoading(false)
            return
        }
        let cancelled = false
        setLoading(true)
        supabase
            .from('profiles')
            .select('id, username, full_name, role, avatar_url, grade_level, section, teacher_id, is_non_reader, is_test')
            .eq('id', userId)
            .single()
            .then(({ data, error }) => {
                if (cancelled) return
                if (error) {
                    console.error('useProfile: failed to load profile', error)
                    setProfile(null)
                } else {
                    setProfile(data as Profile)
                }
                setLoading(false)
            })
        return () => {
            cancelled = true
        }
    }, [userId])

    return { profile, loading }
}