// File: src/pages/admin/useRecordingSessions.ts
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabaseClient.ts'
import { adminRecordingSessionsChannelName } from '../../../lib/realtime.ts'

export type RecordingSessionPresence = {
    adminId: string
    adminName: string
    startedAt: string
}
type PresenceMeta = RecordingSessionPresence & { presence_ref: string }

type TrackOptions = {
    studentId: string
    adminId: string | undefined
    adminName: string
    enabled: boolean
}

/**
 * Reads the shared 'admin-recording-sessions' presence channel (student id -> who's recording them).
 *
 * If `track` is provided, this SAME channel is also used to announce that this admin is now
 * recording `track.studentId` — as soon as the channel reaches SUBSCRIBED, IF nobody else is
 * already tracked under that student id. There must only ever be ONE `supabase.channel()` call
 * per tab for this topic: the realtime-js client dedupes channels by topic and silently no-ops
 * `.subscribe()` on an already-joined channel, so a second, separate channel() call for writing
 * would never actually track anything (this was the original bug).
 */
export function useRecordingSessionsPresence(track?: TrackOptions) {
    const [sessions, setSessions] = useState<Map<string, RecordingSessionPresence>>(new Map())
    const [loaded, setLoaded] = useState(false)

    const trackStudentId = track?.studentId
    const trackAdminId = track?.adminId
    const trackAdminName = track?.adminName
    const trackEnabled = track?.enabled ?? false

    useEffect(() => {
        const channel = supabase.channel(
            adminRecordingSessionsChannelName(),
            trackStudentId ? { config: { presence: { key: trackStudentId } } } : undefined,
        )

        const sync = () => {
            const state = channel.presenceState() as Record<string, PresenceMeta[]>
            const next = new Map<string, RecordingSessionPresence>()
            for (const [studentId, metas] of Object.entries(state)) {
                if (metas[0]) next.set(studentId, metas[0])
            }
            setSessions(next)
            setLoaded(true)
        }

        channel
            .on('presence', { event: 'sync' }, sync)
            .on('presence', { event: 'join' }, sync)
            .on('presence', { event: 'leave' }, sync)
            .subscribe(async (status) => {
                if (status !== 'SUBSCRIBED') return
                if (!trackEnabled || !trackStudentId || !trackAdminId) return

                const state = channel.presenceState() as Record<string, PresenceMeta[]>
                const alreadyTaken = state[trackStudentId]?.[0]
                if (alreadyTaken) return

                const payload: RecordingSessionPresence = {
                    adminId: trackAdminId,
                    adminName: trackAdminName || 'An admin',
                    startedAt: new Date().toISOString(),
                }
                await channel.track(payload)
            })

        return () => {
            supabase.removeChannel(channel)
        }
    }, [trackStudentId, trackAdminId, trackAdminName, trackEnabled])

    return { sessions, loaded }
}