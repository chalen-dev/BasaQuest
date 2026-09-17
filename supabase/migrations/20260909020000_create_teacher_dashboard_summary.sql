-- Teacher-facing progress dashboard (capstone objective: a single screen
-- consolidating every pupil's progress instead of opening each pupil's
-- attempt history one by one). Backs the new TeacherDashboard.tsx page.
--
-- WHY A VIEW, NOT CLIENT-SIDE AGGREGATION: the naive approach (fetch every
-- assessment_attempts row for every pupil, reduce in the browser) is a full
-- table scan repeated on every dashboard load and gets worse every time a
-- pupil reads. This pre-aggregates "latest attempt per pupil per language",
-- "attempt before that" (for the trend arrow), and "pending flagged word
-- count" server-side, in one query, using LATERAL joins with LIMIT/OFFSET —
-- the standard Postgres "top-N per group" pattern, and index-friendly (see
-- the two partial indexes below) unlike a window-function + DISTINCT ON
-- approach over the same data.
--
-- WHY security_invoker: this view touches profiles/assessment_attempts/
-- assessment_attempt_words/remediation_materials, all of which already have
-- per-teacher RLS policies (see 20260809092632, 20260812060319,
-- 20260904023029). A plain view runs as its owner (effectively bypassing
-- RLS, like SECURITY DEFINER); `security_invoker = true` (PG15+, this
-- project runs PG17 per supabase/config.toml) makes it run as the calling
-- role instead, so those existing policies are re-evaluated per caller
-- exactly as if the teacher had queried the base tables directly. No
-- separate auth check needs to be hand-rolled and kept in sync with RLS.
--
-- EXCEPT profiles ITSELF NEEDS AN EXPLICIT FILTER: profiles' own SELECT
-- policy is "Users can view all profiles" using (true) (20260809092632) —
-- deliberately permissive so pupils/teachers can look up names, not scoped
-- to a teacher's own roster. So unlike the other three tables, RLS alone
-- would let this view return every teacher's pupils. The `where
-- p.teacher_id = auth.uid()` below is what actually scopes the roster —
-- same pattern every hooks.ts in this app already uses (e.g.
-- useStudentsQuery's `.eq('teacher_id', teacherId)`), just moved
-- server-side.
--
-- READING COMPREHENSION AND HISTORY MODULE ARE DELIBERATELY ABSENT: no
-- comprehension-specific or history_sessions tables exist yet (still
-- planned, not built). This view only ever reports what's real —
-- TeacherDashboard.tsx is responsible for rendering an honest "Coming
-- soon" badge for those two tracks instead of a fabricated number.
create or replace view public.teacher_dashboard_summary
with (security_invoker = true) as
select
    p.id as student_id,
    p.username,
    p.full_name,
    p.grade_level,
    p.section,
    p.is_disabled,

    en_latest.id as en_latest_attempt_id,
    en_latest.accuracy_score as en_latest_accuracy,
    en_latest.created_at as en_latest_attempt_at,
    en_prev.accuracy_score as en_prev_accuracy,

    fil_latest.id as fil_latest_attempt_id,
    fil_latest.accuracy_score as fil_latest_accuracy,
    fil_latest.created_at as fil_latest_attempt_at,
    fil_prev.accuracy_score as fil_prev_accuracy,

    -- GREATEST/LEAST ignore nulls in Postgres (unlike most functions,
    -- which propagate them) — the result is only null when both languages
    -- have never been attempted, which is exactly what we want for the
    -- "never attempted" tier of the default sort below.
    greatest(en_latest.created_at, fil_latest.created_at) as last_attempt_at,
    least(en_latest.accuracy_score, fil_latest.accuracy_score) as worst_recent_accuracy,

    coalesce(flagged.pending_count, 0)::integer as pending_flagged_word_count,
    coalesce(remediation.stale_count, 0) > 0 as has_stale_remediation

from public.profiles p

-- Most recent SCORED attempt per language. Ungraded attempts (pending/
-- processing/failed) have no accuracy_score worth showing or trending
-- against, so they're excluded the same way dashboard/hooks.ts and
-- review/hooks.ts already do (`.eq('status', 'scored')`).
left join lateral (
    select a.id, a.accuracy_score, a.created_at
    from public.assessment_attempts a
    where a.student_id = p.id and a.language = 'en' and a.status = 'scored'
    order by a.created_at desc
    limit 1
) en_latest on true

-- The SECOND most recent scored EN attempt — i.e. "the one before the
-- latest" — is what the latest gets compared against for the trend
-- indicator. OFFSET 1 LIMIT 1 on the same ordered index as en_latest
-- above, not a second independent query.
left join lateral (
    select a.accuracy_score
    from public.assessment_attempts a
    where a.student_id = p.id and a.language = 'en' and a.status = 'scored'
    order by a.created_at desc
    offset 1 limit 1
) en_prev on true

left join lateral (
    select a.id, a.accuracy_score, a.created_at
    from public.assessment_attempts a
    where a.student_id = p.id and a.language = 'fil' and a.status = 'scored'
    order by a.created_at desc
    limit 1
) fil_latest on true

left join lateral (
    select a.accuracy_score
    from public.assessment_attempts a
    where a.student_id = p.id and a.language = 'fil' and a.status = 'scored'
    order by a.created_at desc
    offset 1 limit 1
) fil_prev on true

-- Flagged words still awaiting a teacher's decision, across every attempt
-- this pupil has. "Flagged" mirrors isFlagged from WordListCard.tsx/
-- PassageCard.tsx/ResultsSummaryCard.tsx exactly (confidence = 'low' OR
-- teacher_manual_flag) — NOT redefined here. "Still pending review" means
-- teacher_reviewed_at is null, the same signal
-- useSubmitReviewMutation/useSaveDraftMutation set when a teacher actually
-- acts on a word.
left join lateral (
    select count(*) as pending_count
    from public.assessment_attempt_words w
    join public.assessment_attempts a2 on a2.id = w.attempt_id
    where a2.student_id = p.id
      and w.teacher_reviewed_at is null
      and (w.teacher_manual_flag = true or w.confidence = 'low')
) flagged on true

-- Remediation material this pupil has never practiced, or hasn't touched
-- in over 7 days. 7 days is a judgment call (not implied anywhere in the
-- schema) — chosen to roughly match a school week, so "stale" means
-- "sitting untouched since at least last week" rather than flagging
-- material generated yesterday. Tune here if that's not the right window.
left join lateral (
    select count(*) as stale_count
    from public.remediation_materials rm
    where rm.student_id = p.id
      and (rm.last_practiced_at is null or rm.last_practiced_at < now() - interval '7 days')
) remediation on true

where p.role = 'student'
  and p.teacher_id = auth.uid();

comment on view public.teacher_dashboard_summary is 'Pre-aggregated per-pupil roster for the teacher progress dashboard (TeacherDashboard.tsx): latest + previous scored attempt per language (for score + trend), count of still-pending flagged words, and whether any remediation material is stale/unpracticed. security_invoker so the existing per-table RLS policies apply per calling teacher; scoped to that teacher''s own roster via an explicit teacher_id = auth.uid() filter since profiles'' own SELECT policy is intentionally permissive (see 20260809092632) and does not itself narrow by teacher. Reading Comprehension and History Module are absent on purpose — no backing tables exist for them yet.';

-- Raw-SQL-created relations need explicit grants — same rule this
-- project's migrations have called out repeatedly (e.g. 20260811102600,
-- 20260904023029): RLS on the underlying tables narrows rows, it doesn't
-- grant base access, and that applies to views built on those tables too.
grant select on public.teacher_dashboard_summary to authenticated;
grant select on public.teacher_dashboard_summary to service_role;

-- Supports both the en_latest/en_prev (and fil_latest/fil_prev) LATERAL
-- joins above: an index on exactly (student_id, language, created_at desc)
-- restricted to scored attempts lets each of those four subqueries do an
-- index-only scan for "top 1" / "top 2nd" instead of sorting a pupil's
-- full attempt history on every dashboard load.
create index if not exists assessment_attempts_student_lang_scored_created_idx
    on public.assessment_attempts (student_id, language, created_at desc)
    where status = 'scored';

-- Supports the `flagged` LATERAL join's count(*): narrows straight to the
-- exact rows that predicate counts (unreviewed AND flagged), so counting
-- doesn't require scanning every word of every attempt.
create index if not exists assessment_attempt_words_pending_flag_idx
    on public.assessment_attempt_words (attempt_id)
    where teacher_reviewed_at is null and (teacher_manual_flag = true or confidence = 'low');
