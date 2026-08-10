// File: src/layouts/GuestLayout.tsx
import { Outlet } from 'react-router-dom'
import Header from "../components/partials/Header.tsx";
import { HillsideBackdrop } from "../components/backgrounds/HillsideBackdrop.tsx";

export default function GuestLayout() {
    return (
        <div className="relative min-h-screen overflow-hidden">
            <HillsideBackdrop />
            <div className="relative z-10">
                <Header />
                <main className="p-4">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}