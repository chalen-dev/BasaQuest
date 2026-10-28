// File: src/pages/proficiency/remediation/coach/features/CoachNotebookSlot.tsx
//
// The word notebook's HTML content (title, pronounce button, close button,
// picture box) — lifted out of RemediationCoachPage.tsx so the admin's
// "Preview in coach" page (admin/word_images/CoachPreviewPage.tsx) renders
// the exact same thing a pupil sees instead of a look-alike copy that could
// drift. It sits directly over NOTEBOOK_ART's blank page, which
// CoachTableBackdrop.tsx renders and slides itself — this is only the thin
// HTML layered on top (no card/border/shadow of its own), same as the
// prototype's own #notebookContent over its SVG notebook. See
// RemediationCoachPage.tsx's header comment ("WORD NOTEBOOK") for the full
// story.
//
// Sized with clamp(...cqw...) rather than fixed Tailwind spacing: this slot
// is a percentage of the cover-fit `coach-stage`, which grows and shrinks
// with the viewport, and cqw is relative to that stage's container-query
// context, so everything tracks the notebook's on-screen size at any width.
// The parent must therefore sit inside a `containerType: 'size'` element
// (the slot renders its own <style> for the fade timing).
import { useState, type CSSProperties } from 'react'
import { Image as ImageIcon, Loader2, Volume2, X } from 'lucide-react'
import type { WordImage } from '../../../../../hooks/useWordImage.ts'

// Where the notebook's content sits, laid directly over NOTEBOOK_ART's
// blank page inside CoachTableBackdrop's own SVG (see that file's header
// comment, "NOTEBOOK ART"). These percentages are the notebook's own local
// paper rect (roughly x:170-727, y:190-800 out of the art's 0-880-ish
// local coordinate space) run through the exact same transform
// NOTEBOOK_ART's wrapping group uses (translate(54 83) scale(0.82)) and
// converted to percentages of the 1670x941 stage viewBox. The stage is
// always uniformly scaled by CSS, so a fixed percentage stays correct at
// any viewport size.
const NOTEBOOK_CONTENT_STYLE: CSSProperties = { left: '11.6%', top: '25.4%', width: '27.3%', height: '53.2%' }

const NOTEBOOK_SLOT_CSS = `
    /* Notebook content slot -- thin, undecorated overlay
    (word text + pronounce + close only) positioned over
    NOTEBOOK_ART's blank page. No border/shadow/background
    of its own -- the real SVG notebook underneath already
    provides all of that, matching how the prototype's own
    #notebookContent is a plain HTML div, not a card. */
    .coach-notebook-slot {
        position: absolute;
        transition: opacity 260ms ease, transform 260ms ease;
        transform: translateY(0);
    }
    .coach-notebook-slot[data-active="false"] {
        opacity: 0;
        transform: translateY(12px);
        pointer-events: none;
    }
    /* Only start fading the notebook's buttons/text in
    once the real SVG notebook (CoachTableBackdrop's
    .coach-notebook-transition) has actually finished
    sliding into place -- delay matches that group's own
    transform transition duration (550ms) exactly, gated
    by data-animate (same flag the owl jump/dialogue use)
    so it never applies on first mount. Closing stays a
    quick, undelayed fade -- the content doesn't need to
    wait for the notebook to fully leave before it's gone. */
    .coach-notebook-slot[data-animate="true"] {
        transition-delay: 550ms;
    }
    .coach-notebook-slot[data-animate="true"][data-active="false"] {
        transition-delay: 0s;
    }
    @media (prefers-reduced-motion: reduce) {
        .coach-notebook-slot { transition: opacity 200ms ease; transition-delay: 0s !important; }
        .coach-notebook-slot[data-active="false"] { transform: translateY(0) !important; }
    }
`

type CoachNotebookSlotProps = {
    open: boolean
    // False until the owl<->notebook toggle has fired once, so the
    // fade-in delay never applies on first mount.
    animate: boolean
    word: string | null
    // undefined/null -> the placeholder icon (no picture for this word).
    image: WordImage | null | undefined
    // Small label under the picture, used for names ("A girl's name"); omit
    // for ordinary words.
    caption?: string | null
    onClose: () => void
    onPronounce: (word: string) => void
    closeLabel: string
    pronounceLabel: string
    placeholderText: string
    // The picture is still being looked up (the picture itself may also still be
    // downloading, which the slot tracks on its own). Shows a spinner in the frame.
    imageLoading?: boolean
    // The pronunciation audio is still being fetched: the speaker icon becomes a spinner.
    pronounceLoading?: boolean
}

export function CoachNotebookSlot({
    open,
    animate,
    word,
    image,
    caption,
    onClose,
    onPronounce,
    closeLabel,
    pronounceLabel,
    placeholderText,
    imageLoading = false,
    pronounceLoading = false,
}: CoachNotebookSlotProps) {
    // The picture file the browser has finished downloading. A new picture shows
    // the spinner again until its own load event fires.
    const [loadedUrl, setLoadedUrl] = useState<string | null>(null)
    const pictureLoading = imageLoading || (!!image && loadedUrl !== image.url)
    return (
        <>
        <style>{NOTEBOOK_SLOT_CSS}</style>
        <div
            className="coach-notebook-slot flex flex-col"
            data-active={open}
            data-animate={animate}
            aria-hidden={!open}
            style={{
                ...NOTEBOOK_CONTENT_STYLE,
                gap: 'clamp(8px, 1.1cqw, 16px)',
                paddingLeft: 'clamp(8px, 1.1cqw, 16px)',
                paddingRight: 'clamp(8px, 1.1cqw, 16px)',
                paddingBottom: 'clamp(8px, 1.1cqw, 16px)',
                paddingTop: 'clamp(2px, 0.4cqw, 6px)',
            }}
        >
            {/* Close -- top-right corner. Its right/top match the slot's own
            paddingRight/paddingTop exactly: an absolutely positioned child's
            containing block is the ancestor's PADDING edge, which excludes
            the ancestor's own padding, so `right: 0`/`top: 0` would sit
            outside the row's padded content instead of flush with it. The
            same clamp() keeps Close's right edge exactly above Pronounce's. */}
            <button
                type="button"
                onClick={onClose}
                aria-label={closeLabel}
                className="absolute flex items-center justify-center rounded-full border-2 border-[var(--coach-nb-soft)] bg-[var(--coach-nb-btn)] text-[var(--coach-nb-ink)] shadow-sm transition-colors duration-150 hover:border-[var(--coach-nb-accent)]"
                style={{
                    right: 'clamp(8px, 1.1cqw, 16px)',
                    top: 'clamp(2px, 0.4cqw, 6px)',
                    width: 'clamp(26px, 3.4cqw, 42px)',
                    height: 'clamp(26px, 3.4cqw, 42px)',
                }}
            >
                <X style={{ width: 'clamp(13px, 1.7cqw, 18px)', height: 'clamp(13px, 1.7cqw, 18px)' }} />
            </button>
            {word ? (
                <>
                    <div
                        className="flex items-center justify-between gap-2"
                        style={{ paddingTop: 'clamp(32px, 4.4cqw, 50px)' }}
                    >
                        <h3
                            className="font-extrabold capitalize leading-tight"
                            style={{ color: 'var(--coach-nb-ink)', fontSize: 'clamp(18px, 2.6cqw, 32px)' }}
                        >
                            {word}
                        </h3>
                        <button
                            type="button"
                            onClick={() => onPronounce(word)}
                            disabled={pronounceLoading}
                            aria-busy={pronounceLoading}
                            aria-label={pronounceLabel}
                            className="flex shrink-0 items-center justify-center rounded-full border-2 border-[var(--coach-nb-soft)] bg-[var(--coach-nb-btn)] text-[var(--coach-nb-ink)] shadow-sm transition-colors duration-150 hover:border-[var(--coach-nb-accent)]"
                            style={{
                                width: 'clamp(26px, 3.4cqw, 42px)',
                                height: 'clamp(26px, 3.4cqw, 42px)',
                            }}
                        >
                            {pronounceLoading ? (
                                <Loader2 className="animate-spin" style={{ width: 'clamp(12px, 1.6cqw, 17px)', height: 'clamp(12px, 1.6cqw, 17px)' }} />
                            ) : (
                                <Volume2 style={{ width: 'clamp(12px, 1.6cqw, 17px)', height: 'clamp(12px, 1.6cqw, 17px)' }} />
                            )}
                        </button>
                    </div>
                    {/* Word picture (word_images table, see useWordImage.ts).
                    Words with no picture keep the prototype's placeholder:
                    colors match its own .word-image-placeholder exactly
                    (border/background var(--word-soft)/var(--word-button),
                    icon stroke var(--word-accent) at .55 opacity). */}
                    <div
                        className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-2xl border-2"
                        style={{ backgroundColor: 'var(--coach-nb-btn)', borderColor: 'var(--coach-nb-soft)' }}
                    >
                        {image ? (
                            <img
                                key={image.url}
                                src={image.url}
                                alt={word}
                                title={image.credit ?? undefined}
                                className={`h-full w-full object-contain p-2 transition-opacity duration-200 ${pictureLoading ? 'opacity-0' : 'opacity-100'}`}
                                ref={(el) => {
                                    // A picture already in the browser cache can finish before
                                    // onLoad is attached.
                                    if (el?.complete && el.naturalWidth > 0) setLoadedUrl(image.url)
                                }}
                                onLoad={() => setLoadedUrl(image.url)}
                                onError={() => setLoadedUrl(image.url)}
                            />
                        ) : imageLoading ? null : (
                            <ImageIcon
                                strokeWidth={2}
                                style={{
                                    width: 'clamp(30px, 4.6cqw, 58px)',
                                    height: 'clamp(30px, 4.6cqw, 58px)',
                                    color: 'var(--coach-nb-accent)',
                                    opacity: 0.55,
                                }}
                            />
                        )}
                        {pictureLoading && (
                            <Loader2
                                role="status"
                                aria-label="Loading picture"
                                className="absolute animate-spin"
                                strokeWidth={2.5}
                                style={{
                                    width: 'clamp(30px, 4.6cqw, 58px)',
                                    height: 'clamp(30px, 4.6cqw, 58px)',
                                    color: 'var(--coach-nb-accent)',
                                }}
                            />
                        )}
                    </div>
                    {caption && (
                        <p
                            className="text-center font-bold leading-tight"
                            style={{ color: 'var(--coach-nb-ink)', fontSize: 'clamp(11px, 1.5cqw, 17px)' }}
                        >
                            {caption}
                        </p>
                    )}
                </>
            ) : (
                <p
                    className="flex flex-1 items-center justify-center text-center font-semibold"
                    style={{
                        color: 'var(--coach-nb-ink)',
                        fontSize: 'clamp(11px, 1.5cqw, 16px)',
                        paddingTop: 'clamp(32px, 4.4cqw, 50px)',
                    }}
                >
                    {placeholderText}
                </p>
            )}
        </div>
        </>
    )
}
