// File: src/components/partials/GuestHeader.tsx
import React from 'react'
import { ThemeToggleButton } from '../buttons/ThemeToggleButton.tsx'
import { LangToggle } from '../buttons/LangToggle.tsx'
import { useLang } from '../../contexts/LangContext.tsx'
import { AuthHint } from '../../pages/auth/components/AuthHint.tsx'

interface GuestHeaderProps {
    showHint?: boolean
    onDismissHint?: () => void
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
export const GuestHeader: React.FC<GuestHeaderProps> = ({ showHint, onDismissHint, hintThemeText, hintLangText }) => {
    const { lang, setLang } = useLang()
    return (
        <div className="relative z-20 flex items-center justify-between p-4">
            <div className="relative">
                <ThemeToggleButton />
                {showHint && hintThemeText && <AuthHint side="left" text={hintThemeText} onClose={onDismissHint} />}
            </div>
            <div className="relative">
                <LangToggle lang={lang} onChange={setLang} />
                {showHint && hintLangText && <AuthHint side="right" text={hintLangText} onClose={onDismissHint} />}
            </div>
        </div>
    )
}

export default GuestHeader