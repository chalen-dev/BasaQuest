
-- Backs the new "Hear Pronunciation" button in RemediationSession.tsx.
-- Replaces the earlier browser-text-to-speech approach (inconsistent
-- voice quality/availability across devices, unacceptable for a feature
-- whose whole point is teaching correct pronunciation) with real Azure
-- neural TTS audio, generated server-side by the new pronounce-word
-- edge function and cached here so the same word is never synthesized
-- twice.
--
-- PUBLIC BUCKET, DELIBERATELY: unlike assessment-recordings or
-- student-recordings (real pupil audio, private + RLS-gated), a
-- pronunciation clip for a generic word like "magkaibigan" carries no
-- student data at all — every pupil who gets that word flagged hears
-- the exact same clip. So there's no privacy reason to gate reads
-- behind RLS/signed URLs; a public bucket lets the browser play the
-- cached URL directly with no extra round-trip. Writes still only ever
-- happen from pronounce-word (using the service-role client, which
-- bypasses RLS/grants entirely), so no insert/update/delete policy is
-- needed here either — nothing but that edge function is ever meant to
-- write into this bucket.
--
-- CACHE KEY SHAPE: "<language>/<slug>.mp3", where slug is the word
-- lowercased, stripped of punctuation/diacritics-adjacent marks, and
-- stripped of apostrophes (see normalizeWord()/slugify() in
-- pronounce-word/index.ts) — deliberately the SAME normalization
-- align.js already uses for word matching, so "araw," (a flagged word
-- with a trailing comma from passage tokenization) and "araw" cache to
-- the identical file instead of needlessly synthesizing both.
insert into storage.buckets (id, name, public)
values ('pronunciation-audio', 'pronunciation-audio', true)
    on conflict (id) do nothing;