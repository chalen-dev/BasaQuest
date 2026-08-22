-- File: supabase/migrations/20260822090500_grant_finetune_service_role.sql
-- finetune_students and finetune_student_consent_files were only ever
-- granted to `authenticated` (see 20260821014130 and 20260821023924) —
-- every other table in this project also grants to `service_role`
-- (profiles, assessment_attempts, reading_sentences,
-- reading_sentence_sets all do this explicitly), but these two tables
-- never got that line. Harmless for the app itself (real users always
-- authenticate as `authenticated`), but it silently 403s anything that
-- connects as service_role — namely the seed script — with "permission
-- denied for table finetune_students" before RLS is even evaluated.
grant select, insert, update, delete on table public.finetune_students to service_role;
grant select, insert, update, delete on table public.finetune_student_consent_files to service_role;