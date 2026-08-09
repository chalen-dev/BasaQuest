import { Outlet } from 'react-router-dom'
import Header from "../components/partials/Header.tsx";

export default function GuestLayout() {
    return (
        <div className="min-h-screen">
            <Header />
            <main className="p-4">
                <Outlet />
            </main>
        </div>
    )
}