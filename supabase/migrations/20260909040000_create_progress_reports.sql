-- Backs the two capstone-required reports: the per-pupil "Progress Report"
-- (printable, parent-shareable) and the teacher's "Class Analytics
-- Report" (roster-wide snapshot). Both are period-scoped (a teacher picks
-- a date range), which a plain view can't parameterize — hence two RPC
-- functions rather than more views like teacher_dashboard_summary
-- (20260909020000). Neither uses SECURITY DEFINER, so both run with the
-- calling teacher's own privileges by default (Postgres functions are
-- SECURITY INVOKER unless declared otherwise) — every RLS policy on
-- assessment_attempts/assessment_attempt_words/remediation_materials/
-- profiles still applies underneath exactly as if the teacher queried
-- those tables directly. Each function also does its own explicit
-- authorization check up front purely for a clear error instead of a
-- silently empty report if someone ever calls it with a pupil that isn't
-- theirs (RLS alone would just return zero rows, not an error).

-- One ongoing free-text note per pupil (not one per generated report) —
-- a teacher's running case-note, always shown on whatever report they
-- pull up next, not tied to any specific date range.
--
-- WHY ITS OWN TABLE INSTEAD OF A COLUMN ON profiles: profiles' own SELECT
-- policy is "Users can view all profiles" using (true) (20260809092632)
-- — deliberately permissive so any authenticated user (including the
-- pupil themselves, or any OTHER teacher) can look up basic roster info.
-- RLS is row-level, not column-level (this project's own migrations note
-- this repeatedly, e.g. 20260825125021) — so a free-text note containing
-- a teacher's private qualitative observations about a child would be
-- just as readable by that permissive policy as full_name is. A separate
-- table with its own tightly-scoped policies keeps that content behind
-- an actual per-teacher boundary.
--
-- student_id is the primary key (not a separate id column) — this is
-- deliberately a single row per pupil, so upserting on student_id is the
-- natural write path and there's no meaningful second row to ever exist.
create table public.pupil_progress_notes (
    student_id uuid primary key references public.profiles(id) on delete cascade,
    note text not null default '',
    updated_at timestamptz not null default now()
);
comment on table public.pupil_progress_notes is 'One ongoing free-text note per pupil, authored by their current teacher, shown on that pupil''s Progress Report. Gated on the pupil''s CURRENT teacher (profiles.teacher_id = auth.uid()), not a stored author id — if a pupil is ever reassigned, the note follows to whoever teaches them now, consistent with how every other per-pupil table in this app resolves ownership.';

alter table public.pupil_progress_notes enable row level security;

create policy "Teachers can view their pupils' notes"
  on public.pupil_progress_notes
  for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = pupil_progress_notes.student_id
        and profiles.teacher_id = auth.uid()
    )
  );

create policy "Teachers can write their pupils' notes"
  on public.pupil_progress_notes
  for insert
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = pupil_progress_notes.student_id
        and profiles.teacher_id = auth.uid()
    )
  );

create policy "Teachers can update their pupils' notes"
  on public.pupil_progress_notes
  for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = pupil_progress_notes.student_id
        and profiles.teacher_id = auth.uid()
    )
  );

-- Raw-SQL-created tables need explicit grants (same rule called out
-- throughout this project's migrations, e.g. 20260904023029).
grant select, insert, update on public.pupil_progress_notes to authenticated;
grant select, insert, update, delete on public.pupil_progress_notes to service_role;


-- Report 1: one pupil's full picture over a period. Returns a single
-- jsonb blob (rather than a flat row) because the shape is genuinely
-- nested (per-language breakdown, an error-type histogram, a top-missed-
-- words list) — same reasoning remediation_materials.words already uses
-- jsonb for a per-entry list instead of a side table.
--
-- English and Filipino are computed as two independent passes inside one
-- FOREACH loop over ['en','fil'] rather than one UNION query — never
-- averaged together, per the report's own requirement, and a loop avoids
-- writing the same five subqueries out twice.
--
-- "Improvement delta" (latest - first accuracy) is only ever set when
-- there are at least 2 scored attempts in the period — with exactly one
-- attempt, first and latest are the same attempt, and showing "+0%"
-- would misreport "no change yet" as "no improvement".
--
-- Error-type % and "most frequently missed words" both use
-- coalesce(teacher_error_type_override, error_type) <> 'None' as the
-- definition of a miss — this is EXACTLY effectiveErrorType() from
-- attemptWordReviewHelpers.ts and computeDominantWeakness() from
-- attemptResultsHelpers.ts, just expressed in SQL, so this report can
-- never disagree with what AttemptResults.tsx already shows for a single
-- attempt.
--
-- Remediation stats are scoped to materials GENERATED within the period
-- (created_at), matching the report's own "reporting period covered"
-- framing — a report about Aug-Sept shouldn't count material generated
-- back in January.
create or replace function public.get_pupil_progress_report(
    p_student_id uuid,
    p_period_start timestamptz,
    p_period_end timestamptz
)
returns jsonb
language plpgsql
stable
as $$
declare
    v_lang text;
    v_by_language jsonb := '{}'::jsonb;
    v_attempt_count integer;
    v_first_accuracy numeric;
    v_latest_accuracy numeric;
    v_avg_fluency numeric;
    v_avg_prosody numeric;
    v_avg_completeness numeric;
    v_error_breakdown jsonb;
    v_total_errors integer;
    v_top_words jsonb;
    v_result jsonb;
begin
    if not exists (
        select 1 from public.profiles
        where id = p_student_id and teacher_id = auth.uid()
    ) then
        raise exception 'Not authorized to view this pupil''s report';
    end if;

    foreach v_lang in array array['en', 'fil'] loop

        select
            count(*),
            (array_agg(a.accuracy_score order by a.created_at asc))[1],
            (array_agg(a.accuracy_score order by a.created_at desc))[1],
            avg(a.fluency_score),
            avg(a.prosody_score),
            avg(a.completeness_score)
        into
            v_attempt_count, v_first_accuracy, v_latest_accuracy,
            v_avg_fluency, v_avg_prosody, v_avg_completeness
        from public.assessment_attempts a
        where a.student_id = p_student_id
          and a.language = v_lang
          and a.status = 'scored'
          and a.created_at >= p_period_start
          and a.created_at < p_period_end;

        select coalesce(jsonb_object_agg(effective_type, cnt), '{}'::jsonb), coalesce(sum(cnt), 0)
        into v_error_breakdown, v_total_errors
        from (
            select coalesce(w.teacher_error_type_override, w.error_type) as effective_type, count(*) as cnt
            from public.assessment_attempt_words w
            join public.assessment_attempts a on a.id = w.attempt_id
            where a.student_id = p_student_id
              and a.language = v_lang
              and a.status = 'scored'
              and a.created_at >= p_period_start
              and a.created_at < p_period_end
              and coalesce(w.teacher_error_type_override, w.error_type) <> 'None'
            group by effective_type
        ) t;

        select coalesce(jsonb_agg(jsonb_build_object('word', reference_word, 'miss_count', miss_count)), '[]'::jsonb)
        into v_top_words
        from (
            select w.reference_word, count(*) as miss_count
            from public.assessment_attempt_words w
            join public.assessment_attempts a on a.id = w.attempt_id
            where a.student_id = p_student_id
              and a.language = v_lang
              and a.status = 'scored'
              and a.created_at >= p_period_start
              and a.created_at < p_period_end
              and coalesce(w.teacher_error_type_override, w.error_type) <> 'None'
              and w.reference_word is not null
            group by w.reference_word
            order by count(*) desc, w.reference_word asc
            limit 10
        ) t;

        v_by_language := v_by_language || jsonb_build_object(
            v_lang, jsonb_build_object(
                'attempt_count', coalesce(v_attempt_count, 0),
                'first_accuracy', v_first_accuracy,
                'latest_accuracy', v_latest_accuracy,
                'improvement_delta', case
                    when v_attempt_count > 1 and v_first_accuracy is not null and v_latest_accuracy is not null
                    then v_latest_accuracy - v_first_accuracy
                    else null
                end,
                'avg_fluency', v_avg_fluency,
                'avg_prosody', v_avg_prosody,
                'avg_completeness', v_avg_completeness,
                'error_breakdown', v_error_breakdown,
                'total_errors', v_total_errors,
                'top_missed_words', v_top_words
            )
        );
    end loop;

    select jsonb_build_object(
        'student', jsonb_build_object(
            'id', p.id,
            'full_name', p.full_name,
            'username', p.username,
            'grade_level', p.grade_level,
            'section', p.section
        ),
        'teacher_name', (select coalesce(t.full_name, t.username) from public.profiles t where t.id = auth.uid()),
        'period_start', p_period_start,
        'period_end', p_period_end,
        'by_language', v_by_language,
        'remediation', (
            select jsonb_build_object(
                'generated_count', count(*),
                'practiced_count', count(*) filter (where rm.last_practiced_at is not null)
            )
            from public.remediation_materials rm
            where rm.student_id = p_student_id
              and rm.created_at >= p_period_start
              and rm.created_at < p_period_end
        ),
        'notes', (select n.note from public.pupil_progress_notes n where n.student_id = p_student_id)
    ) into v_result
    from public.profiles p
    where p.id = p_student_id;

    return v_result;
end;
$$;

comment on function public.get_pupil_progress_report(uuid, timestamptz, timestamptz) is 'Report 1 (per-pupil Progress Report): EN/FIL attempt counts, first-vs-latest accuracy + improvement delta, avg fluency/prosody/completeness, error-type % breakdown, top missed words, and remediation generated/practiced counts — all scoped to [p_period_start, p_period_end) and to the calling teacher''s own pupil (checked explicitly, then re-enforced by RLS on every table this reads).';

grant execute on function public.get_pupil_progress_report(uuid, timestamptz, timestamptz) to authenticated;


-- Report 2: the teacher's whole roster at once, matching the "class-
-- level analytics" / "common error patterns across their class" language
-- this feature was scoped against. No p_teacher_id parameter — always
-- auth.uid(), so there's no way to request another teacher's class by
-- passing a different id.
--
-- "GONE QUIET" THRESHOLD: 14 days with no assessment_attempts row at
-- all (any language, any status) — a judgment call, not implied by the
-- schema. Deliberately different from teacher_dashboard_summary's 7-day
-- remediation-staleness window (20260909020000): that one flags a single
-- piece of unpracticed material after a school week, this one flags a
-- pupil who hasn't even attempted a reading check-in after two.
--
-- SCORE DISTRIBUTION AND EN-VS-FIL COMPARISON SHARE ONE PASS: both need
-- "each pupil's latest scored attempt per language within the period",
-- so both are computed off the same latest_per_pupil_lang CTE instead of
-- two separate scans. Bands are counted PER LANGUAGE (not one combined
-- histogram) — same "never average EN and Filipino together" principle
-- Report 1 uses, just applied to a distribution instead of a single
-- score.
--
-- CLASS-WIDE ERROR PATTERN BREAKDOWN IS COMBINED ACROSS LANGUAGES, ON
-- PURPOSE: unlike the histogram, this answers "what should a whole-class
-- lesson focus on" (e.g. "58% of flagged words this period were
-- Mispronunciation") — a single number worth combining, matching how the
-- feature request itself phrased it ("% of ALL flagged words"). Only
-- Omission/Insertion/Mispronunciation are reported — error_type has no
-- phoneme-level (vowel/consonant) sub-category anywhere in the schema, so
-- this never fabricates one.
--
-- NEEDS-ATTENTION SNAPSHOT: reuses teacher_dashboard_summary verbatim
-- (same tiered order: pending flagged words desc, then longest silence,
-- then lowest score) rather than re-deriving a period-scoped version —
-- that view is inherently about CURRENT status, and "snapshot" here means
-- capturing today's live dashboard state into this printed report, not a
-- different metric.
create or replace function public.get_class_analytics_report(
    p_period_start timestamptz,
    p_period_end timestamptz
)
returns jsonb
language plpgsql
stable
as $$
declare
    v_teacher_id uuid := auth.uid();
    v_total_pupils integer;
    v_active_pupils integer;
    v_histogram jsonb;
    v_lang_avg jsonb;
    v_error_breakdown jsonb;
    v_total_errors integer;
    v_remediation_generated integer;
    v_remediation_practiced integer;
    v_needs_attention jsonb;
    v_result jsonb;
begin
    select count(*) into v_total_pupils
    from public.profiles
    where role = 'student' and teacher_id = v_teacher_id;

    select count(*) into v_active_pupils
    from public.profiles p
    where p.role = 'student' and p.teacher_id = v_teacher_id
      and exists (
          select 1 from public.assessment_attempts a
          where a.student_id = p.id and a.created_at >= now() - interval '14 days'
      );

    -- Each pupil's latest SCORED attempt per language within the period —
    -- the single shared basis for both the score-distribution histogram
    -- and the EN-vs-FIL average comparison below, so "how many pupils
    -- are in each band" and "the class's average score" can never
    -- silently disagree about which attempt counted for a given pupil.
    with latest_per_pupil_lang as (
        select distinct on (a.student_id, a.language)
            a.student_id, a.language, a.accuracy_score
        from public.assessment_attempts a
        join public.profiles p on p.id = a.student_id
        where p.teacher_id = v_teacher_id
          and a.status = 'scored'
          and a.created_at >= p_period_start
          and a.created_at < p_period_end
        order by a.student_id, a.language, a.created_at desc
    ),
    banded as (
        select
            language,
            case
                when accuracy_score >= 90 then '90-100'
                when accuracy_score >= 80 then '80-89'
                when accuracy_score >= 70 then '70-79'
                when accuracy_score >= 60 then '60-69'
                else '0-59'
            end as band
        from latest_per_pupil_lang
        where accuracy_score is not null
    ),
    band_counts as (
        select language, band, count(*) as cnt
        from banded
        group by language, band
    ),
    bands_by_lang as (
        select language, jsonb_object_agg(band, cnt) as bands
        from band_counts
        group by language
    ),
    lang_avg as (
        select language, round(avg(accuracy_score), 1) as avg_score
        from latest_per_pupil_lang
        where accuracy_score is not null
        group by language
    )
    select
        (select coalesce(jsonb_object_agg(language, bands), '{}'::jsonb) from bands_by_lang),
        (select coalesce(jsonb_object_agg(language, avg_score), '{}'::jsonb) from lang_avg)
    into v_histogram, v_lang_avg;

    -- Class-wide error pattern breakdown — deliberately COMBINED across
    -- EN and FIL (unlike the histogram above), answering "what should a
    -- whole-class lesson focus on" rather than "how is each track doing"
    -- — see this function's own header comment for why. Only real
    -- error_type values are reported; no phoneme-level sub-category
    -- exists anywhere in this schema to report.
    select coalesce(jsonb_object_agg(effective_type, cnt), '{}'::jsonb), coalesce(sum(cnt), 0)
    into v_error_breakdown, v_total_errors
    from (
        select coalesce(w.teacher_error_type_override, w.error_type) as effective_type, count(*) as cnt
        from public.assessment_attempt_words w
        join public.assessment_attempts a on a.id = w.attempt_id
        join public.profiles p on p.id = a.student_id
        where p.teacher_id = v_teacher_id
          and a.status = 'scored'
          and a.created_at >= p_period_start
          and a.created_at < p_period_end
          and coalesce(w.teacher_error_type_override, w.error_type) <> 'None'
        group by effective_type
    ) t;

    select coalesce(count(*), 0), coalesce(count(*) filter (where rm.last_practiced_at is not null), 0)
    into v_remediation_generated, v_remediation_practiced
    from public.remediation_materials rm
    join public.profiles p on p.id = rm.student_id
    where p.teacher_id = v_teacher_id
      and rm.created_at >= p_period_start
      and rm.created_at < p_period_end;

    -- Static snapshot of the SAME view the live Progress dashboard uses
    -- (20260909020000), same tiered order — see this function's own
    -- header comment for why this isn't re-derived as a period-scoped
    -- metric.
    select coalesce(jsonb_agg(to_jsonb(s.*)), '[]'::jsonb)
    into v_needs_attention
    from (
        select *
        from public.teacher_dashboard_summary
        order by pending_flagged_word_count desc,
                 last_attempt_at asc nulls first,
                 worst_recent_accuracy asc nulls last
    ) s;

    select jsonb_build_object(
        'teacher_name', (select coalesce(full_name, username) from public.profiles where id = v_teacher_id),
        'period_start', p_period_start,
        'period_end', p_period_end,
        'roster', jsonb_build_object(
            'total_pupils', v_total_pupils,
            'active_pupils', v_active_pupils,
            'quiet_pupils', v_total_pupils - v_active_pupils,
            'quiet_threshold_days', 14
        ),
        'score_distribution', v_histogram,
        'language_average_accuracy', v_lang_avg,
        'error_breakdown', v_error_breakdown,
        'total_errors', v_total_errors,
        'remediation', jsonb_build_object(
            'generated_count', v_remediation_generated,
            'practiced_count', v_remediation_practiced
        ),
        'needs_attention', v_needs_attention
    ) into v_result;

    return v_result;
end;
$$;

comment on function public.get_class_analytics_report(timestamptz, timestamptz) is 'Report 2 (Class Analytics Report): roster health (active vs. gone-quiet, 14-day threshold), per-language score distribution + average accuracy, class-wide combined error-type breakdown, remediation completion, and a static snapshot of teacher_dashboard_summary''s needs-attention ordering — all for the CALLING teacher''s own roster only (auth.uid(), no teacher id parameter) and scoped to [p_period_start, p_period_end) where a query is period-scoped.';

grant execute on function public.get_class_analytics_report(timestamptz, timestamptz) to authenticated;
