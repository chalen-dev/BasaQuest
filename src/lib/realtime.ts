// File: src/lib/realtime.ts
// One realtime channel per teacher, shared by every one of their pupils'
// tabs plus the teacher's own Student List. Pupils track their own
// presence on it (so the teacher can see who's online) and listen on it
// for a "kicked" broadcast aimed specifically at them; the
// force-logout-student edge function sends that broadcast via the
// Realtime REST Broadcast API rather than opening its own websocket.
export const teacherPresenceChannelName = (teacherId: string) => `teacher-presence-${teacherId}`
export const adminRecordingSessionsChannelName = () => 'admin-recording-sessions'