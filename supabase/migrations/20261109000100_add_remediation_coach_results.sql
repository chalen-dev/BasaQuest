-- Reading Coach: keep each page's last scored reading (the green / orange / red
-- colouring of every word) so it is still there the next time the pupil opens
-- the material, on any device.
--
-- ONE JSONB COLUMN ON THE MATERIAL, NOT A NEW TABLE: the colouring belongs to
-- exactly one material and is always read and replaced as a whole with it, the
-- same reasoning that keeps per-word practiced flags inside `words`. Shape:
-- { "<the page's words joined by a space>": ["correct", "omitted", null, ...] },
-- one verdict (or null for a word that was not scored) per word. Keying by the
-- page's own text means a regenerated passage never inherits stale colours.
--
-- No new policy or grant is needed: the UPDATE policy and grant added in
-- 20260904045508_add_remediation_session_progress.sql cover the whole row.
alter table public.remediation_materials
    add column coach_results jsonb not null default '{}'::jsonb;
comment on column public.remediation_materials.coach_results is 'Reading Coach: the last scored reading of each page, as { "<page words joined by a space>": [verdict | null per word] } with verdicts correct / mispronounced / omitted. Written by RemediationCoachPage.tsx after each scored take and when a teacher clears results; empty object until the first reading.';
