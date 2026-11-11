// File: src/pages/profile/hooks.ts
//
// Saving changes to the signed-in person's own profile: their display name and
// their picture. Pictures live in the public "avatars" bucket, one folder per
// user id (see the create_avatars_bucket migration), and profiles.avatar_url
// holds the public address.
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabaseClient.ts'
import { profileKey, type Profile } from '../../hooks/useProfile.ts'
import { namePartsToColumns, type NameParts } from '../../helpers/personName.ts'

const BUCKET = 'avatars'
// Photos are cropped to a square and shrunk; this is plenty for a 96px disc.
const AVATAR_SIZE = 256
export const MAX_PHOTO_BYTES = 15 * 1024 * 1024

// Crops the middle square out of the picture and returns it as a small WebP.
async function squareWebp(file: File): Promise<Blob> {
    const bitmap = await createImageBitmap(file)
    const side = Math.min(bitmap.width, bitmap.height)
    const canvas = document.createElement('canvas')
    canvas.width = AVATAR_SIZE
    canvas.height = AVATAR_SIZE
    canvas
        .getContext('2d')
        ?.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.88))
    if (!blob) throw new Error('Could not read that picture.')
    return blob
}

// "<base>/avatars/<uid>/<file>" -> "<uid>/<file>"; anything else is not ours to delete.
function pathInBucket(url: string | null): string | null {
    if (!url) return null
    const marker = `/${BUCKET}/`
    const at = url.indexOf(marker)
    return at === -1 ? null : url.slice(at + marker.length).split('?')[0]
}

function useCacheUpdate(userId: string) {
    const queryClient = useQueryClient()
    return (patch: Partial<Profile>) =>
        queryClient.setQueryData<Profile>(profileKey(userId), (old) => (old ? { ...old, ...patch } : old))
}

export function useUpdateAvatarMutation(userId: string, currentUrl: string | null) {
    const update = useCacheUpdate(userId)
    return useMutation({
        mutationFn: async (file: File) => {
            const blob = await squareWebp(file)
            // A new file name each time, so the browser never shows a cached old picture.
            const path = `${userId}/${crypto.randomUUID()}.webp`
            const { error: uploadErr } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: 'image/webp' })
            if (uploadErr) throw uploadErr
            const url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
            const { error } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', userId)
            if (error) {
                await supabase.storage.from(BUCKET).remove([path])
                throw error
            }
            // Tidy up the picture it replaces; a failure here only leaves a stray file.
            const old = pathInBucket(currentUrl)
            if (old) await supabase.storage.from(BUCKET).remove([old])
            return url
        },
        onSuccess: (url) => update({ avatar_url: url }),
    })
}

export function useRemoveAvatarMutation(userId: string, currentUrl: string | null) {
    const update = useCacheUpdate(userId)
    return useMutation({
        mutationFn: async () => {
            const { error } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', userId)
            if (error) throw error
            const old = pathInBucket(currentUrl)
            if (old) await supabase.storage.from(BUCKET).remove([old])
        },
        onSuccess: () => update({ avatar_url: null }),
    })
}

export function useUpdateNameMutation(userId: string) {
    const update = useCacheUpdate(userId)
    return useMutation({
        mutationFn: async (name: NameParts) => {
            const columns = namePartsToColumns(name)
            const { error } = await supabase.from('profiles').update(columns).eq('id', userId)
            if (error) throw error
            return columns
        },
        onSuccess: (columns) => update(columns),
    })
}
