
import { useQuery } from '@tanstack/react-query'
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

export const profileKey = (userId: string | undefined) => ['profile', userId] as const

// One shared copy of the signed-in person's profile. The top bar and every page
// read the same cache entry, so a change made on the profile page (a new picture,
// a new name) shows up in the header at once instead of after a reload.
// Keyed on the id, not the user object: Supabase hands out a new object whenever
// the tab regains focus or the token refreshes.
export function useProfile() {
    const { user } = useAuth()
    const userId = user?.id
    const query = useQuery({
        queryKey: profileKey(userId),
        enabled: !!userId,
        staleTime: 5 * 60_000,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, username, full_name, role, avatar_url, grade_level, section, teacher_id, is_non_reader, is_test')
                .eq('id', userId!)
                .single()
            if (error) {
                console.error('useProfile: failed to load profile', error)
                throw error
            }
            return data as Profile
        },
    })

    return { profile: userId ? (query.data ?? null) : null, loading: !!userId && query.isPending }
}
