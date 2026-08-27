// File: AttemptWordReview.tsx
// File: AttemptWordReview.tsx
// File: AttemptWordReview.tsx
// File: AttemptWordReview.tsx
// File: src/pages/students/review/features/AttemptWordReview.tsx
//
// Orchestrator for the shared word-by-word review UI — used both
// inline, right after a "Now" mode session (from AssessmentSession.tsx),
// and standalone on the "Send"-mode review page (TeacherReviewAttempt.tsx).
// Holds all the local state (verdicts, manual flags, manual error-type
// overrides, the stack of tapped words, passage visibility) and hands it
// down to four independent panels — ResultsSummaryCard, PassageCard,
// SelectedWordsCard, and its own Save Draft/Discard/Confirm Results
// buttons container — arranged by the responsive grid below. Kept as one
// component tree specifically so both flows produce identical review
// data instead of two implementations quietly drifting apart.
//
// LAYOUT (below lg — see MOBILE SCROLL FIX below): a HEIGHT-BOUNDED
// single-column stack — height: calc(100vh - heightBudget.base px) —
// with grid-template-areas: "left" "buttons" "wordselect", and
// overflow-y: auto on the GRID ITSELF (not a per-column scroll — there's
// only one column here, so the whole stack — summary, passage, the
// buttons row, AND the selected-words card — scrolls together as one
// unit).
//
// LAYOUT (lg and up): a HEIGHT-BOUNDED two-column grid —
// height: calc(100vh - heightBudget.lg px) — with "left" (summary+
// passage) spanning both rows in column 1, "wordselect" in column 2 row
// 1, and "buttons" in column 2 row 2, sized to its own content
// (grid-template-rows: minmax(0,1fr) auto).
//
// "LEFT" COLUMN INTERNAL LAYOUT (fixed this round — see below): "left"
// used to just be `overflow-y-auto` and rely on the grid's row-span
// math to hand it a bounded height indirectly, with ResultsSummaryCard
// and PassageCard as two plain flex children inside it. That was
// fragile in a way that produced exactly the bug reported (audio
// player squished/cut off, passage text abruptly cut with NO
// scrollbar): a flex container's children can get shrunk/clipped
// instead of the container ever actually overflowing, so overflow-y-
// auto never got a chance to kick in, and the "left" box's real height
// depended on grid-span inheritance instead of being stated directly.
//
// Fixed by giving "left" an EXPLICIT height of its own at lg (the
// .attempt-word-review-left rule below, same calc(100vh - heightBudget.lg
// px) total as the grid), and splitting its two children with the
// standard fixed-header/scrollable-body flex pattern: the results
// summary wrapper is `shrink-0` (never compressible — this alone is
// what stops the audio player from being squeezed), and the passage
// wrapper is `flex-1 min-h-0 overflow-y-auto` (the one combination that
// reliably turns overflow into a real, working scrollbar instead of
// silent clipping). This only changes lg — below lg, "left" has no
// explicit height of its own and both children just stack normally,
// since the MOBILE SCROLL FIX below already makes the whole grid one
// scrollable unit.
//
// WHY BOUNDED AT ALL: ProtectedLayout.tsx's <main> (and
// AssessmentSessionLayout.tsx's own <main>, for the inline "Now" mode
// host) is `overflow-hidden` and effectively pinned to viewport height
// (fixed header, flex-1 in a min-h-screen column) — there is NO
// page-level scrollbar anywhere in this app shell, at ANY viewport
// width. Anything taller than <main>'s box doesn't scroll, it just gets
// silently clipped and becomes unreachable.
//
// MOBILE SCROLL FIX: this used to be a documented gap — the below-lg
// layout was "just stacked, unbounded height, the page flows normally
// like any other page," which is WRONG for this specific app shell:
// there is no page-level scroll to flow into, so on a narrow viewport a
// long passage (or a long selected-words stack) got hard-clipped by
// <main>'s overflow-hidden with no way to reach the rest of it or even
// the buttons row below it. Fixed by giving the below-lg case the same
// bounded-height-plus-overflow-y-auto treatment lg already had, just
// scoped to the whole grid as one scrollable unit (since mobile has
// only one column, there's no per-panel split to make).
//
// VISIBLE SCROLLBAR (.review-scroll): every scrollable region here used
// to rely on the OS/browser's own overflow-y-auto scrollbar, which on
// several platforms (macOS trackpad settings, Chrome's overlay
// scrollbars) is invisible until actively scrolling — giving no visual
// hint there's more content below the fold. .review-scroll forces a
// thin, always-visible (on hover/scroll — see scrollbar-width: thin)
// teal-tinted scrollbar via both the standard scrollbar-width/-color
// properties (Firefox) and the -webkit-scrollbar-* pseudo-elements
// (Chrome/Edge/Safari). Applied to the mobile whole-grid scroll and
// "wordselect" below — the passage's own scroll region no longer lives
// here, it moved INTO PassageCard.tsx itself (still using this same
// .review-scroll class, since the class is global CSS, not scoped to
// this file) so its legend could get a fixed header the same way
// SelectedWordsCard.tsx's does — see PassageCard.tsx's own header
// comment.
//
// THEME-AWARE: the `.dark .review-scroll` overrides below switch the
// thumb from teal-500 to the lighter teal-400 for contrast against dark
// backgrounds — same ".dark <descendant>" selector pattern index.css
// already relies on for the page-level scrollbar (`.dark
// *::-webkit-scrollbar-thumb`), which works because the 'dark' class
// sits on <html> and every element in the tree is its descendant. No
// JS/theme-context wiring needed for this — it's a plain CSS rule that
// reacts to the same class Tailwind's own dark: variant already reads.
//
// HEIGHT BUDGET AS A PROP: the "how much fixed chrome sits above this
// component" number differs by which page hosts it — TeacherReviewAttempt.tsx
// (Send mode, via ProtectedLayout) has a back button and different
// wrapper padding than AssessmentSession.tsx (Now mode, via
// AssessmentSessionLayout), and each layout's own <main> uses a
// different pt-* at each breakpoint. A single hardcoded number here
// used to be calibrated for ONE specific caller (TeacherReviewAttempt.tsx)
// and silently wrong for the other — heightBudget is now an explicit
// prop with a { base (below lg), lg } shape so each caller supplies its
// own real, directly-summed numbers instead of this file guessing.
// Defaults below match TeacherReviewAttempt.tsx's values exactly, so
// that caller keeps working even if it forgets to pass the prop — but
// it passes it explicitly anyway, for the same "don't guess, keep it in
// sync" reason the original number was a direct sum in the first place.
//
// Every word starts defaulted to whatever's already been PERSISTED for
// it — teacher_verdict/teacher_manual_flag/teacher_error_type_override
// when a prior Save Draft (or a completed review) already wrote them,
// falling back to the system's own verdict/no-flag/no-override when
// nothing's been saved yet. This is what makes "Save Draft" actually
// work as save-for-later: reopening the same attempt resumes from the
// last saved state instead of starting over.
//
// "Needs attention" combines TWO independent signals: system-flagged
// (confidence === 'low') and MANUALLY flagged (a teacher tapping the
// "Needs Attention" button on any word).
//
// CORRECT CLEARS THE MANUAL FLAG + TYPE OVERRIDE (see setVerdict below):
// manualFlags/manualErrorType used to be entirely independent of
// verdict, which meant a word could get marked Correct and STILL show
// the amber "Needs Attention" styling from a stale manual flag, or
// still carry a stale Omission/Mispronunciation type override that just
// silently stopped being SHOWN (the type picker only renders for
// verdict === 'miscue') without actually being cleared — so it would
// reappear if the teacher flipped back to Miscue, and worse, would
// still get sent to the backend via buildOverrides() even while the
// word was marked Correct. setVerdict now clears both whenever the new
// verdict is 'correct'. Switching to Miscue leaves both untouched, since
// a miscue can independently be flagged or (re)typed.
//
// manualErrorType lets a teacher reclassify a MISCUE word's error type
// (Omission vs. Mispronunciation) via SelectedWordsCard's type picker.
//
// SAVE DRAFT vs CONFIRM RESULTS vs DISCARD: Save Draft and Confirm
// Results both build the exact same WordReviewOverride[] payload
// (verdict + manual flag + error-type override for every word — see
// buildOverrides below) and hand it to their respective callback prop —
// the only difference is what the PARENT does with it (useSaveDraftMutation
// just writes the per-word columns and leaves the attempt as still-
// pending-review; useSubmitReviewMutation does the same write and then
// also marks the attempt reviewed). DISCARD is a different shape of
// action entirely — it doesn't send any word-level data up, because
// there's nothing to persist: the whole point is the attempt (and every
// word row, and the recording) gets permanently deleted (see
// useDiscardAttemptMutation in hooks.ts). onDiscard is called with no
// arguments. Save Draft has no confirmation (non-destructive); Confirm
// Results and Discard both confirm first, but Discard's confirmation
// copy is deliberately more severe (t.discardDialogText) since, unlike
// Confirm, there's no way back from it at all.
//
// CTRL+S / CMD+S SAVE SHORTCUT: a global keydown listener triggers the
// exact same handleSaveDraft a mouse-click on the button would, with
// preventDefault() to stop the browser's own "Save Page As" dialog from
// popping up. No confirmation needed — same as a manual click, this is
// non-destructive. Disabled under the same conditions the button itself
// is (no words yet, or a save already in flight). This effect
// intentionally has NO dependency array — it re-subscribes after every
// render so the handler always closes over the CURRENT verdicts/
// manualFlags/manualErrorType (via the freshly-recreated
// buildOverrides/handleSaveDraft each render) rather than a stale one
// from whenever the effect first ran; cheap enough not to bother
// memoizing away.
//
// UNSAVED-CHANGES REMINDER TOAST: nothing here auto-saves, so a long
// review session that ends without an explicit Save Draft or Confirm
// (browser closed, tab wandered off) could silently lose every edit.
// hasUnsavedChangesRef flips true on any verdict/flag/type edit and back
// to false whenever a save actually happens (draft or confirm) or a
// different attempt loads. Every REMINDER_INTERVAL_MS a timer checks
// that ref and — only if it's still true — fires a toast nudging the
// teacher to save. Picked at 4 minutes: long enough to not nag during
// normal back-and-forth clicking through words, short enough that a
// teacher who gets pulled away mid-review still gets nudged well before
// losing a large chunk of work. A plain ref (not state) is used for the
// flag itself since nothing here needs to re-render off of it — it only
// ever gets read inside the interval's own closure.
//
// LAST SAVED LABEL: a small caption right above the buttons row — the
// one place a teacher's eye already goes to check "did that save," so
// the answer lives right next to the button rather than in the page's
// global header (which is shared app chrome, not something specific to
// this review screen) or up in ResultsSummaryCard (already a dense
// strip of scores, and further from the actual save action). Seeded on
// load from the words' own PERSISTED teacher_reviewed_at —
// writeWordReviewOverrides in hooks.ts stamps every word with the same
// nowIso on every save (draft OR confirm, since both share that
// function), so the max teacher_reviewed_at across all words already IS
// an accurate "when was this attempt last saved" marker with no
// separate column needed. Shows t.lastSavedNever before any word has
// ever been saved. Updated to "now" the moment a save actually happens
// (Save Draft click, Ctrl+S, Confirm, or the exit-triggered
// saveDraftNow), same optimistic timing as hasUnsavedChangesRef's own
// reset. lastSavedTick just forces a re-render every 20s so the
// relative-time string ("2m ago" → "3m ago") keeps advancing on its own
// without needing any state change to lastSavedAt itself. Discarding
// doesn't touch lastSavedAt at all — the component (and its parent
// page) is about to navigate away regardless, so there's nothing left
// to show a "last saved" label for.
//
// IMPERATIVE HANDLE (forwardRef): AssessmentSession.tsx needs to trigger
// a draft save from OUTSIDE this component tree — specifically from
// AssessmentSessionHeader.tsx's Exit button, a sibling component
// reached through a layout, not a parent — when the teacher exits mid-
// review. Rather than lifting all of verdicts/manualFlags/
// manualErrorType up into AssessmentSession.tsx just for that one case,
// this exposes a single saveDraftNow() escape hatch via useImperativeHandle.
// TeacherReviewAttempt.tsx (the other consumer) never passes a ref,
// which is fine — forwardRef makes the ref entirely optional.
//
// SELECTED-WORDS STACK: there's no separate "select mode" toggle.
// Tapping a word in the passage TOGGLES it: not yet in the stack adds
// it to the top (most-recently-tapped first) and smooth-scrolls
// SelectedWordsCard into view; already in the stack removes it instead
// (deselecting it from the passage ring highlight and pulling its card
// out of SelectedWordsCard) — see handleWordClick below. This used to
// just move an already-stacked word back to the top on re-tap instead
// of removing it; changed per explicit ask, since re-tapping a word you
// were done with had no way to get it back out of the stack short of
// Clear All. Each stacked word gets its own full Correct/Miscue/Needs-
// Attention controls right there in the card. Clearing the stack
// (SelectedWordsCard's Clear All button) only clears which words are
// being actively worked on — it does NOT touch any verdict/flag/
// override already set on them.
//
// BACK TO PASSAGE: an IntersectionObserver watches the passage card
// (#passage-card, set in PassageCard.tsx). Once it scrolls out of view —
// which happens easily on a phone, since the passage itself can be long —
// a floating button appears to scroll back up to it. MOBILE-ONLY
// (lg:hidden below) — on desktop the passage panel scrolls within its
// own bounded column instead of the page moving it out of view, so the
// button would just be dead UI there. Re-attached whenever the attempt
// changes, since a different attempt's word count can change the
// page's scroll height.
//
// AUDIO PLAYBACK: fetched here (useAttemptAudioUrlQuery, keyed off
// attempt.audio_path) and handed down to ResultsSummaryCard as a plain
// URL string — that card just renders an <audio> tag, it doesn't know
// or care that the URL is a signed Supabase Storage URL underneath.
//
// onConfirm/onSaveDraft both hand back an override for EVERY word, not
// just the changed ones — see useSubmitReviewMutation's own comment for
// why that matters (Cohen's kappa agreement-rate tracking needs
// agreement recorded too, not only disagreement). The selected-words
// stack is NOT part of that payload — it's a reviewing aid only,
// nothing to persist.
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { ArrowUp, Save, Send, Trash2 } from 'lucide-react'
import { useLang } from '../../../../contexts/LangContext'
import { useTheme } from '../../../../contexts/ThemeContext'
import { showConfirmation, showToast } from '../../../../helpers/swalHelpers'
import type { AttemptDetail, AttemptWord, Verdict, WordReviewOverride } from '../hooks'
import { useAttemptAudioUrlQuery } from '../hooks'
import { STRINGS, type AttemptWordReviewStrings } from './attemptWordReviewStrings'
import { ResultsSummaryCard } from './ResultsSummaryCard'
import { PassageCard } from './PassageCard'
import { SelectedWordsCard } from './SelectedWordsCard'
// What AssessmentSessionHeader.tsx's Exit button calls (via a ref)
// during an active review, instead of showing its usual confirm dialog.
export type AttemptWordReviewHandle = {
    saveDraftNow: () => Promise<void>
}
// See this file's HEIGHT BUDGET AS A PROP comment above. base = below
// lg (1024px), lg = at/above lg. Both are the number of PIXELS of fixed
// chrome the host page renders above this component at that breakpoint
// — a direct sum of that page's own header/wrapper/back-button
// dimensions, not a guess.
export type AttemptWordReviewHeightBudget = {
    base: number
    lg: number
}
// Matches TeacherReviewAttempt.tsx's own numbers exactly (see this
// file's header comment) — kept as the default so that caller works
// even without explicitly passing the prop, though it passes it anyway.
const DEFAULT_HEIGHT_BUDGET: AttemptWordReviewHeightBudget = { base: 232, lg: 200 }
// See this file's UNSAVED-CHANGES REMINDER TOAST comment above.
const REMINDER_INTERVAL_MS = 4 * 60 * 1000
// See this file's LAST SAVED LABEL comment above — just how often the
// relative-time caption re-renders to advance ("2m ago" → "3m ago").
const LAST_SAVED_TICK_MS = 20 * 1000
// Cheap platform sniff just for which shortcut label to print on the
// Save Draft button (⌘S vs Ctrl+S) — purely cosmetic, doesn't affect
// which key combo actually triggers the save (the keydown handler below
// treats ctrlKey and metaKey as equivalent either way, so this never
// gates functionality, only the label).
const isMacPlatform = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)
// Derives the "last saved" marker straight from the words themselves —
// see this file's LAST SAVED LABEL comment for why no separate column
// is needed. null when no word has ever had teacher_reviewed_at set.
function latestTeacherReviewedAt(words: AttemptWord[]): Date | null {
    let latest: Date | null = null
    for (const w of words) {
        if (!w.teacher_reviewed_at) continue
        const d = new Date(w.teacher_reviewed_at)
        if (!latest || d > latest) latest = d
    }
    return latest
}
// Formats lastSavedAt relative to "now" — just now / Nm ago / Nh ago —
// falling back to lastSavedNever when there's nothing to show yet.
function formatLastSaved(lastSavedAt: Date | null, nowMs: number, t: AttemptWordReviewStrings): string {
    if (!lastSavedAt) return t.lastSavedNever
    const diffMs = nowMs - lastSavedAt.getTime()
    const diffMinutes = Math.floor(diffMs / 60000)
    if (diffMinutes < 1) return t.lastSavedJustNow
    if (diffMinutes < 60) return t.lastSavedMinutesAgo(diffMinutes)
    return t.lastSavedHoursAgo(Math.floor(diffMinutes / 60))
}
type AttemptWordReviewProps = {
    attempt: AttemptDetail
    words: AttemptWord[]
    onConfirm: (overrides: WordReviewOverride[]) => void
    confirming: boolean
    // Typed to allow either a fire-and-forget void handler or an async
    // one — TeacherReviewAttempt.tsx and AssessmentSession.tsx both pass
    // async functions today, and saveDraftNow (below) awaits whatever
    // comes back so an exit-triggered save actually finishes before the
    // page navigates away.
    onSaveDraft: (overrides: WordReviewOverride[]) => void | Promise<void>
    savingDraft: boolean
    // See this file's SAVE DRAFT vs CONFIRM RESULTS vs DISCARD comment
    // above — unlike onConfirm/onSaveDraft, this takes no payload at
    // all: discarding deletes the whole attempt rather than persisting
    // anything about it. The caller is expected to navigate away once
    // this resolves (both current callers do).
    onDiscard: () => void | Promise<void>
    discarding: boolean
    studentName?: string | null
    heightBudget?: AttemptWordReviewHeightBudget
}
export const AttemptWordReview = forwardRef<AttemptWordReviewHandle, AttemptWordReviewProps>(function AttemptWordReview(
    { attempt, words, onConfirm, confirming, onSaveDraft, savingDraft, onDiscard, discarding, studentName, heightBudget = DEFAULT_HEIGHT_BUDGET },
    ref
) {
    const { lang } = useLang()
    const { theme } = useTheme()
    const t = STRINGS[lang]
    const [verdicts, setVerdicts] = useState<Record<string, Verdict>>({})
    const [manualFlags, setManualFlags] = useState<Record<string, boolean>>({})
    const [manualErrorType, setManualErrorType] = useState<Record<string, AttemptWord['error_type']>>({})
    // Words currently stacked in SelectedWordsCard, most-recently-tapped
    // first. See handleWordClick below for the add/remove toggle logic.
    const [selectedWordIds, setSelectedWordIds] = useState<string[]>([])
    const [passageVisible, setPassageVisible] = useState(true)
    // See this file's UNSAVED-CHANGES REMINDER TOAST comment above — a
    // plain ref rather than state, since nothing here needs to re-render
    // off of it.
    const hasUnsavedChangesRef = useRef(false)
    // See this file's LAST SAVED LABEL comment above.
    const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
    const [lastSavedTick, setLastSavedTick] = useState(0)
    const audioUrlQuery = useAttemptAudioUrlQuery(attempt.audio_path)
    // Seeds every word from whatever's already been PERSISTED
    // (teacher_verdict/teacher_manual_flag/teacher_error_type_override,
    // written by a prior Save Draft or a completed review), falling back
    // to the system's own defaults when nothing's been saved yet — and
    // clears the selected-words stack, since that never persists.
    // Re-keyed off attempt.id so switching to a different attempt (the
    // review list flow) resets local state instead of carrying over a
    // previous attempt's edits/flags/overrides/stack. Also resets the
    // unsaved-changes flag and re-seeds lastSavedAt from the words'
    // persisted teacher_reviewed_at — a freshly (re)loaded attempt has
    // nothing unsaved yet, and its "last saved" marker (if any) belongs
    // to a real prior save, not the previous attempt's.
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setVerdicts(Object.fromEntries(words.map((w) => [w.id, w.teacher_verdict ?? w.system_verdict])))
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setManualFlags(Object.fromEntries(words.filter((w) => w.teacher_manual_flag).map((w) => [w.id, true])))
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setManualErrorType(
            Object.fromEntries(
                words
                    .filter((w) => w.teacher_error_type_override != null)
                    .map((w) => [w.id, w.teacher_error_type_override as AttemptWord['error_type']])
            )
        )
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelectedWordIds([])
        hasUnsavedChangesRef.current = false
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLastSavedAt(latestTeacherReviewedAt(words))
    }, [attempt.id, words])
    // Watches the passage card's visibility so the "Back to Passage"
    // floating button only shows once it's actually scrolled off-screen.
    // Re-attached per attempt.id — a fresh AttemptWordReview mount (a
    // different attempt loaded) means the element it needs to observe
    // may not have existed yet on the very first render.
    useEffect(() => {
        const el = document.getElementById('passage-card')
        if (!el) return
        const observer = new IntersectionObserver(
            ([entry]) => setPassageVisible(entry.isIntersecting),
            { threshold: 0 }
        )
        observer.observe(el)
        return () => observer.disconnect()
    }, [attempt.id])
    // Periodic "you have unsaved changes" nudge — see this file's
    // UNSAVED-CHANGES REMINDER TOAST comment above. Re-armed per
    // attempt.id so switching attempts doesn't leave a stale timer
    // nagging about a different attempt's edits.
    useEffect(() => {
        const interval = setInterval(() => {
            if (!hasUnsavedChangesRef.current) return
            showToast(t.unsavedReminderToast, 'info', theme === 'dark', { timer: 5000 })
        }, REMINDER_INTERVAL_MS)
        return () => clearInterval(interval)
    }, [attempt.id, t, theme])
    // Just forces a re-render every LAST_SAVED_TICK_MS so the relative-
    // time caption ("2m ago") keeps advancing without lastSavedAt itself
    // needing to change — see this file's LAST SAVED LABEL comment.
    useEffect(() => {
        const interval = setInterval(() => setLastSavedTick((n) => n + 1), LAST_SAVED_TICK_MS)
        return () => clearInterval(interval)
    }, [])
    // Marking a word Correct also clears its manual "Needs Attention"
    // flag AND any manual error-type override (Omission/Mispronunciation)
    // — see this file's header comment. A Correct word has no error
    // type, so leaving a stale override in state was both a UI glitch
    // (it silently reappeared if you flipped back to Miscue) and a
    // correctness bug (buildOverrides() would still send that stale
    // errorTypeOverride to the backend even though the word is Correct).
    // Marking it Miscue leaves both manualFlags and manualErrorType
    // untouched, since a miscue can independently be flagged or typed.
    const setVerdict = (wordId: string, verdict: Verdict) => {
        setVerdicts((prev) => ({ ...prev, [wordId]: verdict }))
        hasUnsavedChangesRef.current = true
        if (verdict === 'correct') {
            setManualFlags((prev) => {
                if (!prev[wordId]) return prev
                const next = { ...prev }
                delete next[wordId]
                return next
            })
            setManualErrorType((prev) => {
                if (!(wordId in prev)) return prev
                const next = { ...prev }
                delete next[wordId]
                return next
            })
        }
    }
    const toggleManualFlag = (wordId: string) => {
        setManualFlags((prev) => ({ ...prev, [wordId]: !prev[wordId] }))
        hasUnsavedChangesRef.current = true
    }
    // Toggle behavior: clicking the currently-active type again clears
    // the override (reverts the word to whatever the system detected).
    const setErrorType = (wordId: string, errorType: 'Omission' | 'Mispronunciation') => {
        setManualErrorType((prev) => {
            const next = { ...prev }
            if (next[wordId] === errorType) {
                delete next[wordId]
            } else {
                next[wordId] = errorType
            }
            return next
        })
        hasUnsavedChangesRef.current = true
    }
    // Passage-side word click: TOGGLES the word in the stack. Already
    // stacked (checked against the current selectedWordIds before the
    // state update, since setSelectedWordIds is async) → removed, and
    // no scroll happens since there's nothing new to reveal. Not yet
    // stacked → added to the top, then SelectedWordsCard is scrolled
    // into view so the newly-added card is visible. No confirmation
    // dialog either way: this isn't destructive, just a small card
    // appearing/disappearing. Not itself a review edit (nothing here
    // gets persisted), so it does NOT touch hasUnsavedChangesRef.
    const handleWordClick = (wordId: string) => {
        const alreadySelected = selectedWordIds.includes(wordId)
        setSelectedWordIds((prev) =>
            alreadySelected ? prev.filter((id) => id !== wordId) : [wordId, ...prev]
        )
        if (!alreadySelected) {
            document.getElementById('selected-words-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
    }
    const clearSelectedWords = () => setSelectedWordIds([])
    const scrollToPassage = () => {
        document.getElementById('passage-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    // Shared by handleConfirm, handleSaveDraft, and saveDraftNow below —
    // every word, every time, not just the ones actually changed (see
    // this file's header comment for why). manualErrorType only ever
    // holds 'Omission' or 'Mispronunciation' values (setErrorType's own
    // signature restricts it to those two), so the cast below just
    // narrows the type back down from the wider AttemptWord['error_type']
    // the state uses.
    const buildOverrides = (): WordReviewOverride[] =>
        words.map((w) => ({
            wordId: w.id,
            verdict: verdicts[w.id] ?? w.system_verdict,
            manualFlag: !!manualFlags[w.id],
            errorTypeOverride: (manualErrorType[w.id] as 'Omission' | 'Mispronunciation' | undefined) ?? null,
        }))
    const handleConfirm = async () => {
        const confirmed = await showConfirmation(
            t.confirmDialogTitle,
            t.confirmDialogText,
            theme === 'dark',
            'question',
            t.confirmDialogConfirmButton
        )
        if (!confirmed) return
        hasUnsavedChangesRef.current = false
        setLastSavedAt(new Date())
        onConfirm(buildOverrides())
    }
    // No confirmation dialog — Save Draft is non-destructive (it never
    // marks the attempt reviewed) and meant to be tapped freely while
    // still working through a review, unlike Confirm Results. Clears
    // hasUnsavedChangesRef and bumps lastSavedAt optimistically on click
    // (same moment the button's own "Saving…" label kicks in) rather
    // than waiting on onSaveDraft's promise to settle — matches how the
    // rest of this component already treats Save Draft as fire-and-
    // forget from here.
    const handleSaveDraft = () => {
        onSaveDraft(buildOverrides())
        hasUnsavedChangesRef.current = false
        setLastSavedAt(new Date())
    }
    // Permanently deletes the attempt — see this file's SAVE DRAFT vs
    // CONFIRM RESULTS vs DISCARD comment above. Fires a swal confirmation
    // first, same shape as Confirm Results' own dialog but with more
    // severe copy (t.discardDialogText), since unlike Confirm there's no
    // way back from this at all. No local state to clear afterward
    // (unlike handleConfirm/handleSaveDraft) — the caller navigates away
    // once onDiscard resolves, so there's nothing left for this
    // component to keep track of.
    const handleDiscard = async () => {
        const confirmed = await showConfirmation(
            t.discardDialogTitle,
            t.discardDialogText,
            theme === 'dark',
            'warning',
            t.discardDialogConfirmButton
        )
        if (!confirmed) return
        await onDiscard()
    }
    // CTRL+S / CMD+S → same action as clicking Save Draft. See this
    // file's own CTRL+S / CMD+S SAVE SHORTCUT comment above for why this
    // effect has no dependency array.
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const isSaveShortcut = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's'
            if (!isSaveShortcut) return
            e.preventDefault()
            if (!hasWords || savingDraft) return
            handleSaveDraft()
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    })
    // The escape hatch AssessmentSessionHeader.tsx's Exit button uses
    // (via a ref held by AssessmentSession.tsx) to save the in-progress
    // review before navigating away — see this file's header comment.
    useImperativeHandle(ref, () => ({
        saveDraftNow: async () => {
            hasUnsavedChangesRef.current = false
            setLastSavedAt(new Date())
            await onSaveDraft(buildOverrides())
        },
    }))
    const hasWords = words.length > 0
    // lastSavedTick is read here (even though it does nothing but force
    // this component to re-render) purely so formatLastSaved's relative
    // string recomputes against a fresh "now" every LAST_SAVED_TICK_MS —
    // see this file's LAST SAVED LABEL comment.
    const lastSavedLabel = formatLastSaved(lastSavedAt, Date.now() + lastSavedTick * 0, t)
    // Discard is intentionally NOT gated on hasWords — discarding a
    // wordless attempt is exactly as valid as discarding one with words,
    // unlike Save Draft/Confirm Results which have nothing to persist
    // without word data. It IS gated on the other three in-flight
    // actions, so a teacher can't fire two conflicting mutations at once.
    const anyActionInFlight = savingDraft || confirming || discarding
    return (
        <div className="flex flex-col gap-6">
            {hasWords && (
                // Scoped by the unique .attempt-word-review-grid class
                // name and .review-scroll class below. See this file's
                // header comment for the full explanation of the height
                // budget, why below-lg now also gets a bounded height +
                // scroll, and why "left" now gets its OWN explicit
                // height + a fixed-header/scrollable-body flex split
                // instead of relying on the grid's row-span math.
                <style>{`
                    .attempt-word-review-grid {
                        display: grid;
                        gap: 1.5rem;
                        grid-template-areas: "left" "buttons" "wordselect";
                    }
                    @media (max-width: 1023px) {
                        .attempt-word-review-grid {
                            height: calc(100vh - ${heightBudget.base}px);
                            overflow-y: auto;
                        }
                    }
                    @media (min-width: 1024px) {
                        .attempt-word-review-grid {
                            grid-template-columns: 1.3fr 1fr;
                            grid-template-rows: minmax(0, 1fr) auto;
                            align-items: stretch;
                            grid-template-areas: "left wordselect" "left buttons";
                            height: calc(100vh - ${heightBudget.lg}px);
                        }
                        .attempt-word-review-left {
                            height: calc(100vh - ${heightBudget.lg}px);
                        }
                    }
                    .review-scroll {
                        scrollbar-width: thin;
                        scrollbar-color: rgba(20, 184, 166, 0.55) transparent;
                    }
                    .review-scroll::-webkit-scrollbar {
                        width: 8px;
                    }
                    .review-scroll::-webkit-scrollbar-track {
                        background: transparent;
                    }
                    .review-scroll::-webkit-scrollbar-thumb {
                        background-color: rgba(20, 184, 166, 0.55);
                        border-radius: 9999px;
                    }
                    .review-scroll::-webkit-scrollbar-thumb:hover {
                        background-color: rgba(20, 184, 166, 0.8);
                    }
                    /* Dark-mode thumb: same ".dark <descendant>" pattern
                    index.css already uses for the page-level scrollbar
                    (.dark *::-webkit-scrollbar-thumb) — the 'dark' class
                    lives on <html>, so every element including this one
                    is a match for ".dark .review-scroll". Shifted to
                    teal-400 (lighter/more saturated) instead of teal-500,
                    for contrast against dark backgrounds. */
                    .dark .review-scroll {
                        scrollbar-color: rgba(45, 212, 191, 0.55) transparent;
                    }
                    .dark .review-scroll::-webkit-scrollbar-thumb {
                        background-color: rgba(45, 212, 191, 0.55);
                    }
                    .dark .review-scroll::-webkit-scrollbar-thumb:hover {
                        background-color: rgba(45, 212, 191, 0.8);
                    }
                `}</style>
            )}
            <div className={hasWords ? 'attempt-word-review-grid review-scroll' : 'flex flex-col gap-6'}>
                <div
                    style={{ gridArea: hasWords ? 'left' : undefined }}
                    className="attempt-word-review-left flex flex-col gap-6 lg:min-h-0"
                >
                    {/* Never compressible — this is what stops the
                    audio player (inside ResultsSummaryCard) from being
                    squeezed/cut off. A plain flex child would otherwise
                    shrink below its natural size to help "left" fit,
                    instead of the passage wrapper below giving up its
                    own space first. */}
                    <div className="shrink-0">
                        <ResultsSummaryCard
                            attempt={attempt}
                            studentName={studentName}
                            words={words}
                            manualFlags={manualFlags}
                            t={t}
                            audioUrl={audioUrlQuery.data ?? null}
                        />
                    </div>
                    {/* Just sizing here now — flex-1 lets this wrapper
                    take whatever's left after the results card above,
                    min-h-0 overrides the default min-height:auto that
                    would otherwise let it grow past that space. The
                    ACTUAL scrolling (and its own fixed legend header)
                    now lives inside PassageCard.tsx itself — see that
                    file's own header comment — mirroring
                    SelectedWordsCard.tsx's header/scrolling-body split,
                    per explicit ask to make the legend behave the same
                    way. lg-only: below lg the whole grid scrolls as one
                    unit instead (see MOBILE SCROLL FIX above), so this
                    stays a plain block there and PassageCard's own
                    header/body split just lays out normally with no
                    internal scroll of its own. */}
                    <div className="lg:min-h-0 lg:flex-1">
                        <PassageCard
                            words={words}
                            verdicts={verdicts}
                            manualFlags={manualFlags}
                            manualErrorType={manualErrorType}
                            selectedWordIds={selectedWordIds}
                            t={t}
                            onWordClick={handleWordClick}
                        />
                    </div>
                </div>
                {hasWords && (
                    <div style={{ gridArea: 'wordselect' }} className="review-scroll lg:min-h-0 lg:overflow-y-auto">
                        <SelectedWordsCard
                            words={words}
                            selectedWordIds={selectedWordIds}
                            verdicts={verdicts}
                            manualFlags={manualFlags}
                            manualErrorType={manualErrorType}
                            t={t}
                            onSetVerdict={setVerdict}
                            onToggleManualFlag={toggleManualFlag}
                            onSetErrorType={setErrorType}
                            onClearAll={clearSelectedWords}
                        />
                    </div>
                )}
                <div style={{ gridArea: hasWords ? 'buttons' : undefined }} className="flex flex-col gap-1.5">
                    {/* LAST SAVED LABEL — see this file's own comment.
                    Centered on mobile (buttons stack full-width there),
                    left-aligned once the buttons sit side-by-side at sm
                    and up, so it reads as attached to the Save Draft
                    button specifically rather than floating in the
                    middle. */}
                    <p className="px-1 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 sm:text-left">
                        {lastSavedLabel}
                    </p>
                    {/* Its own bordered/shadowed container, distinct from
                    the other panels, per explicit ask — these buttons
                    act on the whole review, not on any one panel alone.
                    Sized to its own content (grid row is `auto`), never
                    part of the scrolling 1fr row at lg, and — post
                    MOBILE SCROLL FIX — reachable below lg by scrolling
                    the whole grid down to it, instead of being
                    unreachable past whatever got clipped above it.
                    Discard sits first/leftmost — furthest from Confirm
                    Results, the primary action — styled distinctly in
                    rose to read as destructive at a glance, same visual
                    language SelectedWordsCard's Miscue button and
                    showSaveOnLeaveConfirmation's own discard option
                    already use elsewhere in this review UI. */}
                    <div className="flex flex-col gap-2 rounded-3xl border border-gray-900/5 bg-white/60 p-4 shadow-sm dark:border-gray-100/10 dark:bg-gray-900/40 sm:flex-row">
                        <button
                            onClick={handleDiscard}
                            disabled={anyActionInFlight}
                            className={`flex items-center justify-center gap-2 rounded-full border-2 border-rose-500/40 px-5 py-3 text-sm font-bold text-rose-600 transition-colors duration-150 dark:border-rose-400/30 dark:text-rose-400 ${
                                anyActionInFlight
                                    ? 'cursor-not-allowed opacity-50'
                                    : 'cursor-pointer hover:bg-rose-500/10 dark:hover:bg-rose-400/10'
                            }`}
                        >
                            <Trash2 size={16} />
                            {discarding ? t.discarding : t.discardLabel}
                        </button>
                        <button
                            onClick={handleSaveDraft}
                            disabled={anyActionInFlight || !hasWords}
                            className={`flex items-center justify-center gap-2 rounded-full border-2 border-teal-500/40 px-5 py-3 text-sm font-bold text-teal-700 transition-colors duration-150 dark:border-teal-400/30 dark:text-teal-300 ${
                                anyActionInFlight || !hasWords
                                    ? 'cursor-not-allowed opacity-50'
                                    : 'cursor-pointer hover:bg-teal-500/10 dark:hover:bg-teal-400/10'
                            }`}
                        >
                            <Save size={16} />
                            {savingDraft ? t.savingDraftLabel : t.saveDraftLabel}
                            {/* Shortcut hint, hidden on the smallest
                            screens where Ctrl/Cmd+S isn't a realistic
                            gesture anyway (no physical keyboard). Purely
                            cosmetic — see isMacPlatform's own comment. */}
                            {!savingDraft && (
                                <kbd className="hidden rounded-md border border-teal-500/30 bg-teal-500/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-teal-700 dark:border-teal-400/30 dark:bg-teal-400/10 dark:text-teal-300 sm:inline-block">
                                    {isMacPlatform ? '⌘S' : 'Ctrl+S'}
                                </kbd>
                            )}
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={anyActionInFlight || !hasWords}
                            className={`flex flex-1 items-center justify-center gap-2 rounded-full bg-teal-500 px-6 py-3 text-base font-bold text-white shadow-[0_4px_0_0_#0f766e] transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_1px_0_0_#0f766e] dark:bg-teal-600 dark:shadow-[0_4px_0_0_#115e59] ${
                                anyActionInFlight || !hasWords ? 'cursor-not-allowed opacity-50 hover:translate-y-0' : 'cursor-pointer'
                            }`}
                        >
                            <Send size={17} />
                            {confirming ? t.confirming : t.confirmLabel}
                        </button>
                    </div>
                </div>
            </div>
            {hasWords && !passageVisible && (
                <button
                    onClick={scrollToPassage}
                    className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-teal-500 px-4 py-3 text-sm font-bold text-white shadow-lg transition-transform duration-150 hover:-translate-y-0.5 dark:bg-teal-600 lg:hidden"
                >
                    <ArrowUp size={16} />
                    {t.backToPassageLabel}
                </button>
            )}
        </div>
    )
})