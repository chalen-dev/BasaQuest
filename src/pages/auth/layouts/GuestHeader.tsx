// File: src/pages/auth/layouts/GuestHeader.tsx
import React from 'react'
import { ThemeToggleButton } from '../../../components/buttons/ThemeToggleButton.tsx'
import { LangToggle } from '../../../components/buttons/LangToggle.tsx'
import { useLang } from '../../../contexts/LangContext.tsx'
import { Hint } from '../../../components/ui/Hint.tsx'
interface GuestHeaderProps {
    showHints?: boolean
    hintThemeText?: string
    hintLangText?: string
}
// Bare header for the guest (login/register) pages — no border, no fill,
// just enough structure to hold the theme toggle (left) and language
// toggle (right) in normal document flow, instead of each button being
// independently `absolute`-positioned inside every auth page (which is
// what put the theme button in a weird spot before). Rendered once by
// GuestLayout, above <Outlet/>, so it's shared across /login and
// /register rather than duplicated in each page component.
//
// The two onboarding hints are now independent <Hint> instances (see
// components/ui/Hint.tsx) with their own ids — "guest-theme-toggle" and
// "guest-lang-toggle" — instead of both reading one shared showHint
// boolean the way the old AuthHint/useAuthEntryHint setup did. That old
// setup meant closing either hint's X button closed BOTH of them, since
// there was only ever one boolean deciding visibility for the whole page.
// `persist={false}` on both keeps the original product behavior: these
// reappear on every fresh visit (direct load/refresh), not just once
// ever, since GuestLayout controls that via the `showHints` gate (derived
// from whether this is a fresh arrival vs. a login<->register switch).
//
// Each toggle sits inside a small frosted "chip" (translucent background +
// blur + ring + shadow) rather than directly on the hillside backdrop —
// the art behind the header varies a lot in brightness/color, so a bare
// button could lose contrast depending on what's behind it. The chip gives
// both toggles a consistent, always-readable backing regardless of the
// scenery.
export const GuestHeader: React.FC<GuestHeaderProps> = ({ showHints = true, hintThemeText, hintLangText }) => {
    const { lang, setLang } = useLang()
    return (
        <div className="relative z-20 flex items-center justify-between p-4">
            <div className="relative rounded-full bg-white/80 p-1 shadow-md ring-1 ring-black/5 backdrop-blur-sm transition-colors duration-300 dark:bg-slate-800/80 dark:ring-white/10">
                <ThemeToggleButton />
                {hintThemeText && (
                    <Hint id="guest-theme-toggle" text={hintThemeText} align="start" show={showHints} persist={false} />
                )}
            </div>
            <div className="relative rounded-full bg-white/80 p-1 shadow-md ring-1 ring-black/5 backdrop-blur-sm transition-colors duration-300 dark:bg-slate-800/80 dark:ring-white/10">
                <LangToggle lang={lang} onChange={setLang} />
                {hintLangText && (
                    <Hint id="guest-lang-toggle" text={hintLangText} align="end" show={showHints} persist={false} />
                )}
            </div>
        </div>
    )
}
export default GuestHeader