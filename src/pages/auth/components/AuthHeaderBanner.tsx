// File: src/pages/auth/components/AuthHeaderBanner.tsx
import React from 'react'
import dayArt from '../../../assets/auth/header-day.svg'
import nightArt from '../../../assets/auth/header-night.svg'
import owlPerch from '../../../assets/auth/header-owl.png'
import './AuthHeaderBanner.css'

interface AuthHeaderBannerProps {
    title?: string
    subtitle?: string
}

/**
 * Card header for the login and register cards: a painted library shelf (a day
 * and a night picture that cross-fade with the theme) with the owl perched on
 * two short planks, and the school's name beside it. The look lives in
 * AuthHeaderBanner.css; the pictures are in src/assets/auth.
 */
export const AuthHeaderBanner: React.FC<AuthHeaderBannerProps> = ({
    title = 'BasaQuest',
    subtitle = 'Sto. Niño Elementary School',
}) => {
    const art = { '--ab-day-art': `url("${dayArt}")`, '--ab-night-art': `url("${nightArt}")` } as React.CSSProperties
    return (
        <header className="auth-banner" style={art}>
            <span className="auth-banner__art auth-banner__art--day" aria-hidden="true" />
            <span className="auth-banner__art auth-banner__art--night" aria-hidden="true" />
            <div className="auth-banner__row">
                <div className="auth-banner__perch">
                    <img src={owlPerch} alt="" />
                    <span className="auth-banner__plank" />
                    <span className="auth-banner__plank auth-banner__plank--bottom" />
                </div>
                <div className="auth-banner__identity">
                    <div className="auth-banner__brand">{title}</div>
                    <div className="auth-banner__school">{subtitle}</div>
                </div>
            </div>
        </header>
    )
}

export default AuthHeaderBanner
