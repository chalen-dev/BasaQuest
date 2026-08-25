// File: devFlags.ts
// File: basaquest-final/devFlags.ts
//
// Single flip-the-switch file for expensive external calls this app can
// skip during local development/testing. Lives at the project root
// (rather than buried inside src/) specifically so both flags are easy
// to find in one place — same spirit as a root .env file, just plain TS
// consts instead of environment variables, since these are dev-only
// toggles, not secrets or per-environment config.
//
// NOTE: this file lives OUTSIDE src/, so it had to be added explicitly to
// tsconfig.app.json's "include" array (alongside "src") — otherwise `tsc`
// errors on any import of it from inside src/ ("not listed within the
// file list of project"). If this file is ever moved or renamed, update
// that include entry too.

// Skips the generate-passage Supabase Edge Function (Gemini) and uses
// PLACEHOLDER_PASSAGES from assessmentSessionStrings.ts instead. No
// Gemini credits spent.
export const USE_PLACEHOLDER_PASSAGE = true

// Skips the POST to the basaquest-scoring service (Azure Pronunciation
// Assessment) and fabricates plausible scored data directly via
// applyPlaceholderScoring() (features/placeholderScoring.ts) instead. No
// Azure credits spent, and basaquest-scoring doesn't even need to be
// running.
export const USE_PLACEHOLDER_SCORING = true