// File: src/pages/admin/recording/session/layouts/AdminSessionLayout.tsx
// Same shape as AssessmentSessionLayout, but paired with
// AdminSessionHeader instead — used only for the fine-tune mic-capture
// screen (/admin/recording/session), where navigation away mid-recording
// is intentionally locked out. Still nests inside PersistentBackdropLayout
// (see App.tsx) so the same hillside backdrop shows behind it as the rest
// of the app.
import { Outlet } from 'react-router-dom'
import AdminSessionHeader from './AdminSessionHeader.tsx'
export default function AdminSessionLayout() {
    return (
        <div className="flex min-h-screen flex-col bg-orange-50 transition-colors duration-300 dark:bg-gray-950">
            <AdminSessionHeader />
            <main className="relative flex-1 overflow-hidden p-4 pt-24 lg:pt-20">
                <div className="relative z-10">
                    <Outlet />
                </div>
            </main>
        </div>
    )
}