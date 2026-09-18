
-- Supports the new passage-based Reading Coach Mode: instead of one
-- isolated sentence per weak word, a teacher-generated remediation
-- material now also carries a SET of natural, multi-word passages —
-- each covering a subset of the weak-word list, with every weak word
-- guaranteed to appear as a highlighted target somewhere across the
-- whole set. See generate-remediation-passages/index.ts for the
-- generation prompt, and remediation/hooks.ts's RemediationPassage type
-- for the shape stored here.
--
-- NEW TOP-LEVEL COLUMN, NOT A FIELD INSIDE words: a passage spans
-- multiple word entries, so it doesn't belong nested under any single
-- one of them the way sentenceWords/coachTip do today (those stay put,
-- unused by new generations, so old materials keep rendering exactly as
-- they always have — see RemediationCoach.tsx's own fallback chain).
--
-- NULLABLE, NO BACKFILL: same "snapshot at generation time, absent on
-- older rows" pattern as every other optional field this table has
-- picked up since its original migration (last_practiced_at,
-- sentenceWords/coachTip inside words). Rows generated before this
-- feature existed simply have passages = null.
--
-- NO NEW POLICY NEEDED: the teacher-approved passage set is only ever
-- written once, as part of the same insert that already creates the
-- row (see the new review screen in AttemptResults.tsx's generation
-- flow) — the existing insert policy from this table's original
-- migration already covers writing this column, same as it already
-- covers `words`.
alter table public.remediation_materials
    add column passages jsonb;
comment on column public.remediation_materials.passages is 'Array of { passageWords, targetIndices, targetWords, coachTip } — Gemini-generated multi-word practice passages covering this material''s weak-word list, approved by the teacher on the generation-preview screen before this row is inserted. Null on material generated before this feature existed, or where passage generation failed and the teacher proceeded without it; Reading Coach Mode falls back to its earlier per-word sentence rendering in that case.';
