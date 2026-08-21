// File: src/pages/_layouts/PersistentBackdropLayout.tsx
// A wrapper whose ONLY job is: render HillsideBackdrop once, then pass
// everything else through via <Outlet/>. It has nothing to do with
// authentication or any specific page group — it doesn't check login
// state, redirect, or render a nav bar. The one thing it does is keep the
// background mounted while react-router swaps the Outlet's child between
// routes, so the backdrop's CSS animations (clouds mid-drift, stars
// mid-twinkle) don't reset every time you navigate.
//
// Used in App.tsx in two places: wrapping the guest/auth routes
// (Login/Register — two separate route components that used to each mount
// their own HillsideBackdrop, so switching between them reset the
// animation) and wrapping the authenticated routes around ProtectedLayout
// (dashboard/home/reading-proficiency), so both route groups persist their
// background the same explicit way rather than each doing something
// different internally.
import { Outlet } from 'react-router-dom'
import { HillsideBackdrop } from '../../components/backgrounds/HillsideBackdrop.tsx'
export default function PersistentBackdropLayout() {
    return (
        <div className="relative min-h-dvh overflow-hidden">
            <HillsideBackdrop />
            <Outlet />
        </div>
    )
}