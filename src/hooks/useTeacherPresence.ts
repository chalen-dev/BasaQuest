// File: src/hooks/useTeacherPresence.ts
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { teacherPresenceChannelName } from '../lib/realtime'

// Read-only subscription to the same per-teacher channel pupils track
// themselves on. Returns a live Set of currently-online student IDs, used
// by the Student List to render an online/offline dot per row and to tell
// the force-logout-student edge function whether a kick can reach the
// pupil live or needs to fall back to a ban.
export function useTeacherPresence(teacherId: string | undefined) {
    const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set())

    useEffect(() => {
        if (!teacherId) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setOnlineIds(new Set())
            return
        }

        const channel = supabase.channel(teacherPresenceChannelName(teacherId))

        const syncOnlineIds = () => {
            setOnlineIds(new Set(Object.keys(channel.presenceState())))
        }

        channel
            .on('presence', { event: 'sync' }, syncOnlineIds)
            .on('presence', { event: 'join' }, syncOnlineIds)
            .on('presence', { event: 'leave' }, syncOnlineIds)
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [teacherId])

    return onlineIds
}