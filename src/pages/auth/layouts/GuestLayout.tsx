// File: src/pages/auth/layouts/GuestLayout.tsx
import { Outlet, useLocation } from 'react-router-dom'
import { GuestHeader } from './GuestHeader.tsx'
import { HillsideBackdrop } from '../../../components/backgrounds/HillsideBackdrop.tsx'
import { useLang } from '../../../contexts/LangContext.tsx'

const HINT_STRINGS: Record<'fil' | 'en', { theme: string; lang: string }> = {
    fil: {
        theme: 'Pindutin dito para sa araw o gabi! ✨',
        lang: 'Piliin ang wika mo dito! 🌐',
    },
    en: {
        theme: 'Tap here for day or night! ✨',
        lang: 'Pick your language here! 🌐',
    },
}

// Shared shell for /login and /register — replaces the old
// PersistentBackdropLayout for this route group. Owns the backdrop, the
// bare GuestHeader (theme + language toggles — previously duplicated as
// independently-absolute-positioned buttons inside each page), and the
// first-visit onboarding hints, which used to live in each page too and
// are identical wording between Login and Register anyway. Since this one
// layout wraps both routes without unmounting between them,
// HillsideBackdrop's animations keep the same persistence property
// PersistentBackdropLayout used to provide.
//
// Hint visibility is now driven straight off `cameFromSwitch` (no more
// useAuthEntryHint.ts — that hook's only job was owning a single showHint
// boolean, which is exactly the piece that caused both hints to close
// together; each <Hint> in GuestHeader now owns its own dismissal via
// HintContext instead). Hints show on any "fresh" arrival — direct visit,
// refresh, or landing here right after logout — but NOT when the user got
// here by clicking the "switch to login/register" link on the other auth
// page, since that's still the same auth session, not a fresh visit.
//
// Outer wrapper uses `overflow-x-hidden` (not `overflow-hidden`) so the
// animated backdrop stays clipped horizontally without blocking vertical
// page scroll on shorter viewports (Login/Register handle their own
// vertical scrolling internally).
//
// GuestHeader is now `fixed` at the top of the viewport (see
// GuestHeader.tsx) instead of sitting in normal document flow, so it no
// longer pushes <main> down on its own — `pt-20` on <main> reserves that
// same space manually so page content doesn't render underneath the
// header chips.
export default function GuestLayout() {
    const location = useLocation()
    const { lang } = useLang()
    const cameFromSwitch = Boolean((location.state as { fromAuthSwitch?: boolean } | null)?.fromAuthSwitch)
    const hints = HINT_STRINGS[lang]
    return (
        <div className="relative flex min-h-dvh flex-col overflow-x-hidden">
            <HillsideBackdrop />
            <div className="relative z-10 flex flex-1 flex-col">
                <GuestHeader
                    showHints={!cameFromSwitch}
                    hintThemeText={hints.theme}
                    hintLangText={hints.lang}
                />
                <main className="flex flex-1 flex-col pt-20">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}