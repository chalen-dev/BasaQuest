// File: src/pages/profile/ProfilePage.tsx
//
// "My profile" (/profile), opened by clicking the name and picture in the top
// bar. A teacher (or admin) can set a profile picture and a display name here.
// The username is how they sign in, so it is shown but not editable.
import React, { useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeft, Camera, Trash2 } from 'lucide-react'
import { useProfile } from '../../hooks/useProfile.ts'
import { useAuth } from '../../contexts/AuthContext.tsx'
import { useLang } from '../../contexts/LangContext.tsx'
import { useTheme } from '../../contexts/ThemeContext.tsx'
import { Avatar } from '../../components/ui/Avatar.tsx'
import { showToast } from '../../helpers/swalHelpers.ts'
import { MAX_PHOTO_BYTES, useRemoveAvatarMutation, useUpdateAvatarMutation, useUpdateNameMutation } from './hooks.ts'

const STRINGS = {
    fil: {
        back: 'Bumalik',
        title: 'Aking Profile',
        photo: 'Larawan sa profile',
        photoHint: 'Pumili ng larawan. Gagawin itong bilog at ipapakita sa itaas na bar.',
        change: 'Palitan ang larawan',
        add: 'Magdagdag ng larawan',
        remove: 'Alisin',
        uploading: 'Ina-upload…',
        details: 'Mga detalye',
        name: 'Pangalan',
        namePlaceholder: 'Ang iyong buong pangalan',
        nameHint: 'Ito ang makikita ng iba. Maaaring iwanang blangko.',
        username: 'Username',
        usernameHint: 'Ito ang gamit mo sa pag-login at hindi mapapalitan dito.',
        role: 'Tungkulin',
        save: 'I-save',
        saving: 'Sine-save…',
        saved: 'Na-save ang profile',
        photoSaved: 'Napalitan ang larawan',
        photoRemoved: 'Naalis ang larawan',
        notImage: 'Larawan lang ang puwede (JPG, PNG o WebP).',
        tooBig: 'Masyadong malaki ang larawan (hanggang 15 MB).',
        failed: 'Hindi na-save. Subukan muli.',
        roles: { teacher: 'Guro', admin: 'Admin', student: 'Estudyante' } as Record<string, string>,
    },
    en: {
        back: 'Back',
        title: 'My Profile',
        photo: 'Profile picture',
        photoHint: 'Pick a picture. It is cropped to a circle and shown in the top bar.',
        change: 'Change picture',
        add: 'Add a picture',
        remove: 'Remove',
        uploading: 'Uploading…',
        details: 'Details',
        name: 'Name',
        namePlaceholder: 'Your full name',
        nameHint: 'This is what others see. You can leave it blank.',
        username: 'Username',
        usernameHint: 'You use this to log in, so it cannot be changed here.',
        role: 'Role',
        save: 'Save',
        saving: 'Saving…',
        saved: 'Profile saved',
        photoSaved: 'Picture updated',
        photoRemoved: 'Picture removed',
        notImage: 'Only pictures work (JPG, PNG or WebP).',
        tooBig: 'That picture is too big (up to 15 MB).',
        failed: 'Could not save. Please try again.',
        roles: { teacher: 'Teacher', admin: 'Admin', student: 'Student' } as Record<string, string>,
    },
}

const frosted = 'rounded-3xl border border-white/40 bg-white/80 p-5 shadow-sm backdrop-blur-md dark:border-gray-100/10 dark:bg-gray-900/70 sm:p-6'
const label = 'mb-1 block text-xs font-extrabold uppercase tracking-wide text-gray-500 dark:text-gray-400'
const field =
    'w-full rounded-xl border border-gray-900/15 bg-white px-3 py-2 text-sm font-semibold text-gray-900 dark:border-gray-100/15 dark:bg-gray-950 dark:text-gray-50'
const button =
    'cursor-pointer rounded-full px-4 py-2 text-sm font-bold transition-[transform,box-shadow] duration-150 disabled:cursor-not-allowed disabled:opacity-40'
const primary = `${button} bg-amber-500 text-white shadow-[0_3px_0_0_#b45309] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_1px_0_0_#b45309] dark:bg-amber-600 dark:shadow-[0_3px_0_0_#92400e]`
const secondary = `${button} border border-gray-900/10 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-100/10 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800`

const ProfilePage: React.FC = () => {
    const navigate = useNavigate()
    const { user } = useAuth()
    const { lang } = useLang()
    const { theme } = useTheme()
    const { profile, loading } = useProfile()
    const t = STRINGS[lang]

    if (loading) return null
    // Pupils sign in through their teacher and have no profile page of their own.
    if (!profile || profile.role === 'student') return <Navigate to="/home" replace />

    const username = profile.username ?? (user?.email as string | undefined) ?? 'Guest'
    return (
        <ProfileForm
            key={profile.id}
            t={t}
            dark={theme === 'dark'}
            userId={profile.id}
            username={username}
            role={profile.role}
            fullName={profile.full_name ?? ''}
            avatarUrl={profile.avatar_url}
            onBack={() => (window.history.length > 1 ? navigate(-1) : navigate('/home'))}
        />
    )
}

type FormProps = {
    t: (typeof STRINGS)['en']
    dark: boolean
    userId: string
    username: string
    role: string
    fullName: string
    avatarUrl: string | null
    onBack: () => void
}

function ProfileForm({ t, dark, userId, username, role, fullName, avatarUrl, onBack }: FormProps) {
    const fileRef = useRef<HTMLInputElement>(null)
    const [name, setName] = useState(fullName)
    const updateAvatar = useUpdateAvatarMutation(userId, avatarUrl)
    const removeAvatar = useRemoveAvatarMutation(userId, avatarUrl)
    const updateName = useUpdateNameMutation(userId)
    const busy = updateAvatar.isPending || removeAvatar.isPending
    const dirty = name.trim() !== fullName.trim()

    const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        e.target.value = ''
        if (!file) return
        if (!file.type.startsWith('image/')) return void showToast(t.notImage, 'error', dark)
        if (file.size > MAX_PHOTO_BYTES) return void showToast(t.tooBig, 'error', dark)
        updateAvatar.mutate(file, {
            onSuccess: () => showToast(t.photoSaved, 'success', dark),
            onError: () => showToast(t.failed, 'error', dark),
        })
    }
    const onRemove = () =>
        removeAvatar.mutate(undefined, {
            onSuccess: () => showToast(t.photoRemoved, 'success', dark),
            onError: () => showToast(t.failed, 'error', dark),
        })
    const onSave = (e: React.FormEvent) => {
        e.preventDefault()
        updateName.mutate(name, {
            onSuccess: () => showToast(t.saved, 'success', dark),
            onError: () => showToast(t.failed, 'error', dark),
        })
    }

    return (
        <div className="mx-auto max-w-2xl px-4 pb-12 pt-6">
            <button
                onClick={onBack}
                className="mb-4 flex cursor-pointer items-center gap-1.5 rounded-full border border-gray-900/10 bg-white px-4 py-1.5 text-sm font-bold text-gray-700 shadow-sm transition-colors duration-200 hover:bg-gray-900/5 dark:border-gray-100/10 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-100/10"
            >
                <ArrowLeft size={16} /> {t.back}
            </button>
            <h1 className="mb-4 text-2xl font-extrabold text-gray-900 dark:text-gray-50">{t.title}</h1>

            <div className="flex flex-col gap-4">
                <section className={frosted} aria-label={t.photo}>
                    <h2 className={label}>{t.photo}</h2>
                    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
                        <Avatar url={avatarUrl} name={username} size={112} className="border-4 border-white shadow-md dark:border-gray-800" />
                        <div className="flex min-w-0 flex-1 flex-col items-center gap-3 sm:items-start">
                            <p className="text-center text-sm font-semibold text-gray-600 dark:text-gray-300 sm:text-left">{t.photoHint}</p>
                            <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                                <input ref={fileRef} type="file" accept="image/*" onChange={onPick} className="hidden" />
                                <button type="button" disabled={busy} onClick={() => fileRef.current?.click()} className={`${primary} flex items-center gap-1.5`}>
                                    <Camera size={16} />
                                    {updateAvatar.isPending ? t.uploading : avatarUrl ? t.change : t.add}
                                </button>
                                {avatarUrl && (
                                    <button type="button" disabled={busy} onClick={onRemove} className={`${secondary} flex items-center gap-1.5`}>
                                        <Trash2 size={15} /> {t.remove}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                <form className={frosted} onSubmit={onSave}>
                    <h2 className={label}>{t.details}</h2>
                    <div className="flex flex-col gap-4">
                        <div>
                            <label htmlFor="profile-name" className={label}>{t.name}</label>
                            <input
                                id="profile-name"
                                value={name}
                                maxLength={60}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={t.namePlaceholder}
                                className={field}
                            />
                            <p className="mt-1 text-xs font-semibold text-gray-500 dark:text-gray-400">{t.nameHint}</p>
                        </div>
                        <div>
                            <label htmlFor="profile-username" className={label}>{t.username}</label>
                            <input id="profile-username" value={username} readOnly className={`${field} cursor-not-allowed opacity-70`} />
                            <p className="mt-1 text-xs font-semibold text-gray-500 dark:text-gray-400">{t.usernameHint}</p>
                        </div>
                        <div>
                            <span className={label}>{t.role}</span>
                            <p className="text-sm font-bold text-gray-900 dark:text-gray-50">{t.roles[role] ?? role}</p>
                        </div>
                        <div className="flex justify-end">
                            <button type="submit" disabled={!dirty || updateName.isPending} className={primary}>
                                {updateName.isPending ? t.saving : t.save}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default ProfilePage
