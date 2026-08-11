// File: src/hooks/useSessionPresence.ts
import { useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { useProfile } from './useProfile'
import { supabase } from '../lib/supabaseClient'
import { teacherPresenceChannelName } from '../lib/realtime'
import { showForcedNotice } from '../helpers/swalHelpers'

// Mounted once, globally (see App.tsx), for every authenticated user —
// but only actually does anything for students. It tracks this tab's
// presence on its teacher's shared realtime channel (so the teacher's
// Student List can show an online/offline dot per pupil), and listens on
// that same channel for a "kicked" broadcast aimed at this specific
// student, fired by the force-logout-student edge function when a
// teacher force-logs-out a currently-online pupil.
//
// Deliberately NOT scoped to a specific route/layout (see the comment in
// App.tsx) — a student mid-assessment-session should still be reachable.
export function useSessionPresence() {
    const { user, logout } = useAuth()
    const { theme } = useTheme()
    const { profile } = useProfile()

    useEffect(() => {
        if (!user || !profile || profile.role !== 'student' || !profile.teacher_id) return

        const channel = supabase.channel(teacherPresenceChannelName(profile.teacher_id), {
            config: { presence: { key: profile.id } },
        })

        channel
            .on('broadcast', { event: 'kicked' }, ({ payload }) => {
                // The channel is shared by every pupil of this teacher —
                // ignore broadcasts meant for a classmate.
                if (payload?.studentId !== profile.id) return
                logout().finally(() => {
                    showForcedNotice(
                        `Na-alis ka sa sistema ng iyong guro.<br/>You've been logged out by your teacher.`,
                        theme === 'dark'
                    )
                })
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({ online_at: new Date().toISOString() })
                }
            })

        return () => {
            supabase.removeChannel(channel)
        }
    }, [user, profile, theme, logout])
}