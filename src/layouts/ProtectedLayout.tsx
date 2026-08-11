// File: src/layouts/DashboardLayout.tsx
// The HillsideBackdrop used to be rendered directly inside this layout's
// <main>. It's now supplied by PersistentBackdropLayout, which App.tsx
// nests just outside DashboardLayout for the authenticated route group —
// same pattern as the guest/auth routes, so both route groups persist
// their background the same explicit way instead of DashboardLayout
// quietly doing its own thing.
//
// Header is now `fixed` (not `sticky`) so it stays pinned to the very top
// of the viewport regardless of scroll position — it used to be `sticky`,
// which only sticks within its own scroll container and can still get
// pushed around depending on layout. Because `fixed` removes it from
// document flow, <main> gets extra top padding (pt-28 on mobile where the
// header wraps to two rows, pt-20 on lg+ where it's a single row) so page
// content doesn't start out hidden underneath it.
import { Outlet } from 'react-router-dom'
import ProtectedHeader from "../components/partials/ProtectedHeader.tsx";
export default function ProtectedLayout() {
    return (
        <div className="flex min-h-screen flex-col bg-orange-50 transition-colors duration-300 dark:bg-gray-950">
            <ProtectedHeader />
            <main className="relative flex-1 overflow-hidden p-4 pt-28 lg:pt-20">
                <div className="relative z-10">
                    <Outlet />
                </div>
            </main>
        </div>
    )
}