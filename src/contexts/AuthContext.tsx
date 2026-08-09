
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'

type AuthContextType = {
    session: Session | null
    user: User | null
    isAuthenticated: boolean
    loading: boolean
    signUp: (email: string, password: string, username: string) => Promise<void>
    login: (identifier: string, password: string) => Promise<void>
    logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [session, setSession] = useState<Session | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // check for an existing session on first load
        supabase.auth.getSession().then(({ data }) => {
            setSession(data.session)
            setLoading(false)
        })
        // listen for login/logout/token refresh events
        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
        })
        return () => listener.subscription.unsubscribe()
    }, [])

    const signUp = async (email: string, password: string, username: string) => {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { username }, // this is what your trigger reads via raw_user_meta_data
            },
        })
        if (error) throw error
    }

    const login = async (identifier: string, password: string) => {
        // the login form collects a *username* (e.g. "guro"), but Supabase
        // Auth only knows emails. Every seeded/signed-up account's email
        // follows the "<username>@basaquest.local" convention, so map it
        // here. If someone types a real email (contains "@"), use it as-is.
        const email = identifier.includes('@') ? identifier : `${identifier}@basaquest.local`
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
    }

    const logout = async () => {
        const { error } = await supabase.auth.signOut()
        if (error) throw error
    }

    return (
        <AuthContext.Provider
            value={{
                session,
                user: session?.user ?? null,
                isAuthenticated: Boolean(session),
                loading,
                signUp,
                login,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used within AuthProvider')
    return ctx
}