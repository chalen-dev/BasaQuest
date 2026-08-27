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

// Calls the real generate-passage Supabase Edge Function (Gemini)
// instead of using PLACEHOLDER_PASSAGES from assessmentSessionStrings.ts.
// Spends Gemini credits on every passage generated.
export const USE_PLACEHOLDER_PASSAGE = false

// Calls the real basaquest-scoring service (Azure Pronunciation
// Assessment) instead of fabricating scored data via
// applyPlaceholderScoring() (features/placeholderScoring.ts). Spends
// Azure credits, and requires basaquest-scoring to actually be
// running and reachable at VITE_SCORING_SERVICE_URL.
export const USE_PLACEHOLDER_SCORING = true