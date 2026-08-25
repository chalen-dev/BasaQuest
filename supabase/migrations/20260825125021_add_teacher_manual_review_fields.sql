-- File: supabase/migrations/<TIMESTAMP>_add_teacher_manual_review_fields.sql
--
-- Two review-time signals that AttemptWordReview.tsx has been tracking
-- as LOCAL COMPONENT STATE ONLY (manualFlags / manualErrorType) — they
-- reset on reload because there's never been a column for them. Adding
-- one now because of the new "Save Draft" feature: without a column,
-- a draft save could only ever persist teacher_verdict (which already
-- has a column, written by the existing Confirm Results flow) and would
-- silently drop whatever the teacher flagged or reclassified, which
-- defeats half the point of being able to pause and resume a review.
--
-- teacher_manual_flag: a teacher tapping "Needs Attention" on a word
-- regardless of what the system's own confidence score said — kept
-- separate from `confidence` (system-computed, read-only) exactly like
-- the UI already keeps them conceptually separate (isFlagged = confidence
-- === 'low' OR manual flag). Defaults false, never null, since "not
-- flagged" is a real, common, meaningful state, not an absence of data.
--
-- teacher_error_type_override: lets a teacher manually reclassify a
-- miscue as Omission or Mispronunciation when the system's own
-- `error_type` guessed wrong. Nullable — null means "no override, defer
-- to the system's error_type" (see effectiveErrorType in
-- attemptWordReviewHelpers.ts, which already implements exactly that
-- fallback for the in-memory version of this value). Constrained to just
-- those two values because that's all the type-picker in WordListCard.tsx
-- ever offers — Insertion and None aren't picker options, so there's
-- nothing meaningful to override them TO.
--
-- No RLS/grant changes needed: assessment_attempt_words already grants
-- authenticated update and already has policies letting both the
-- assigned teacher and the attempt's own student update a row (see
-- 20260812060319 and 20260825111500) — adding columns to an
-- already-updatable table doesn't need new policies, since this
-- project's grants are table-level, not column-level.
alter table public.assessment_attempt_words
    add column teacher_manual_flag boolean not null default false,
  add column teacher_error_type_override text null;

alter table public.assessment_attempt_words
    add constraint assessment_attempt_words_teacher_error_type_override_check
        check (teacher_error_type_override is null or teacher_error_type_override in ('Omission', 'Mispronunciation'));