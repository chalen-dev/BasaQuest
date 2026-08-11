// File: src/pages/auth/StudentSessionBridge.tsx
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useTheme } from '../../contexts/ThemeContext'
import { showToast } from '../../helpers/swalHelpers'

// Landing page for a tab opened via "Log in as this student" in the
// teacher's roster. supabaseClient.ts already detected (from this route)
// that this tab should use its own isolated, tab-scoped session storage
// instead of the shared one — so redeeming the one-time token here can
// never touch the teacher's session in whatever tab they clicked from.
export default function StudentSessionBridge() {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const { theme } = useTheme()
    const [error, setError] = useState('')

    useEffect(() => {
        const tokenHash = searchParams.get('token')
        if (!tokenHash) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setError('Missing or invalid login link.')
            return
        }
        supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'magiclink' }).then(({ data, error: verifyErr }) => {
            if (verifyErr) {
                setError(verifyErr.message)
                return
            }
            const username =
                (data.session?.user?.user_metadata?.username as string | undefined) ??
                data.session?.user?.email?.split('@')[0] ??
                'friend'
            showToast(
                `Maligayang pagbabalik, ${username}!<br/>Welcome back, ${username}!`,
                'success',
                theme === 'dark',
                { closable: true, timer: 4000 }
            )
            navigate('/home', { replace: true })
        })
    }, [searchParams, navigate, theme])

    return (
        <div className="flex min-h-dvh items-center justify-center px-4 text-center">
            {error ? (
                <div>
                    <p className="mb-1 text-base font-extrabold text-gray-900 dark:text-gray-50">Couldn't open this session</p>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{error}</p>
                    <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                        You can close this tab and try again from the student list.
                    </p>
                </div>
            ) : (
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Logging in…</p>
            )}
        </div>
    )
}