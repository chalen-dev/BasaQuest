// File: src/pages/admin/_hooks/useWordImages.ts
// Admin-side management of the word_images table + word-images bucket (the
// reading side is src/hooks/useWordImage.ts). One picture file can back
// several words (mango + mangga, or paaralan + eskwelahan), so everything
// here works on a PictureGroup — all rows that share an image_path — rather
// than on single rows.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabaseClient.ts'
import { fetchAllWordImageRows, normalizeImageWord } from '../../../hooks/useWordImage.ts'

const BUCKET = 'word-images'
const MAX_SIZE = 512

export type WordImageRow = {
    id: string
    language: 'en' | 'fil'
    word: string
    image_path: string
    source: 'arasaac' | 'openmoji' | 'wikimedia' | 'upload'
    credit: string | null
    source_url: string | null
    reviewed: boolean
}

export type PictureGroup = {
    imagePath: string
    url: string
    source: WordImageRow['source']
    credit: string | null
    // True only when every word row on this picture has been reviewed.
    reviewed: boolean
    words: { id: string; language: 'en' | 'fil'; word: string }[]
}

const wordImagesKey = ['word_images', 'admin'] as const

export function publicUrl(path: string): string {
    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
}

export function useWordImageGroupsQuery() {
    return useQuery({
        queryKey: wordImagesKey,
        queryFn: async () => {
            const rows = await fetchAllWordImageRows<WordImageRow>(
                'id, language, word, image_path, source, credit, source_url, reviewed',
            )
            rows.sort((a, b) => a.word.localeCompare(b.word))
            const groups = new Map<string, PictureGroup>()
            for (const row of rows) {
                let g = groups.get(row.image_path)
                if (!g) {
                    g = {
                        imagePath: row.image_path,
                        url: publicUrl(row.image_path),
                        source: row.source,
                        credit: row.credit,
                        reviewed: true,
                        words: [],
                    }
                    groups.set(row.image_path, g)
                }
                if (!row.reviewed) g.reviewed = false
                g.words.push({ id: row.id, language: row.language, word: row.word })
            }
            return [...groups.values()].sort((a, b) => a.words[0].word.localeCompare(b.words[0].word))
        },
    })
}

// Shrinks uploads to a small WebP before they hit storage — admin photos can
// be several MB, and these only ever show in a notebook card. SVGs and
// anything the browser can't decode are uploaded as they came.
async function prepareImage(file: File): Promise<{ blob: Blob; ext: string; type: string }> {
    const fallbackExt = file.name.split('.').pop()?.toLowerCase() || 'png'
    const original = { blob: file as Blob, ext: fallbackExt, type: file.type || 'application/octet-stream' }
    if (file.type === 'image/svg+xml') return original
    try {
        const bitmap = await createImageBitmap(file)
        const scale = Math.min(1, MAX_SIZE / Math.max(bitmap.width, bitmap.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(bitmap.width * scale)
        canvas.height = Math.round(bitmap.height * scale)
        canvas.getContext('2d')?.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.85))
        return blob ? { blob, ext: 'webp', type: 'image/webp' } : original
    } catch {
        return original
    }
}

async function uploadNewFile(file: File): Promise<string> {
    const { blob, ext, type } = await prepareImage(file)
    const path = `upload-${crypto.randomUUID()}.${ext}`
    const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: type })
    if (error) throw error
    return path
}

// Only delete the file once nothing points at it any more.
async function removeFileIfUnused(path: string) {
    const { count, error } = await supabase
        .from('word_images')
        .select('id', { count: 'exact', head: true })
        .eq('image_path', path)
    if (error) throw error
    if ((count ?? 0) > 0) return
    const { error: removeErr } = await supabase.storage.from(BUCKET).remove([path])
    if (removeErr) throw removeErr
}

export type AddPictureArgs = {
    english: string
    filipino: string
    file: File
    credit: string
}

// Adds (or overwrites) the picture for an English word and, if given, its
// Filipino spelling — same shape as one row of the import script's CSV.
export function useAddPictureMutation() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ english, filipino, file, credit }: AddPictureArgs) => {
            const records: { language: 'en' | 'fil'; word: string }[] = []
            const enKey = normalizeImageWord(english)
            const filKey = normalizeImageWord(filipino)
            if (enKey) records.push({ language: 'en', word: enKey })
            if (filKey) records.push({ language: 'fil', word: filKey })
            if (records.length === 0) throw new Error('Enter an English or Filipino word.')

            // Overwriting a word that already has a picture leaves its old
            // file behind unless it's cleaned up below.
            const { data: previous } = await supabase
                .from('word_images')
                .select('image_path, language, word')
                .or(records.map((r) => `and(language.eq.${r.language},word.eq.${r.word})`).join(','))

            const path = await uploadNewFile(file)
            const { error } = await supabase.from('word_images').upsert(
                records.map((r) => ({
                    ...r,
                    image_path: path,
                    source: 'upload',
                    credit: credit.trim() || 'Uploaded by admin',
                    source_url: null,
                    reviewed: true,
                    reviewed_at: new Date().toISOString(),
                })),
                { onConflict: 'language,word' },
            )
            if (error) {
                await supabase.storage.from(BUCKET).remove([path])
                throw error
            }
            for (const p of new Set((previous ?? []).map((r) => r.image_path))) await removeFileIfUnused(p)
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['word_images'] }),
    })
}

// Replaces the picture for every word in the group at once.
export function useReplacePictureMutation() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ group, file, credit }: { group: PictureGroup; file: File; credit: string }) => {
            const path = await uploadNewFile(file)
            const { error } = await supabase
                .from('word_images')
                .update({
                    image_path: path,
                    source: 'upload',
                    credit: credit.trim() || 'Uploaded by admin',
                    source_url: null,
                    reviewed: true,
                    reviewed_at: new Date().toISOString(),
                })
                .eq('image_path', group.imagePath)
            if (error) {
                await supabase.storage.from(BUCKET).remove([path])
                throw error
            }
            await removeFileIfUnused(group.imagePath)
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['word_images'] }),
    })
}

// Marks one picture (all its words) reviewed, or sends it back to Needs
// review. `groups` takes several at once for "Approve all on this page".
export function useSetReviewedMutation() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ imagePaths, reviewed }: { imagePaths: string[]; reviewed: boolean }) => {
            const { error } = await supabase
                .from('word_images')
                .update({ reviewed, reviewed_at: reviewed ? new Date().toISOString() : null })
                .in('image_path', imagePaths)
            if (error) throw error
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['word_images'] }),
    })
}

// Points another word at this picture (e.g. a Filipino spelling the import
// missed). A word that already had a different picture moves over to this
// one, and its old file is cleaned up if nothing else uses it.
export function useAddWordToPictureMutation() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ group, language, word }: { group: PictureGroup; language: 'en' | 'fil'; word: string }) => {
            const key = normalizeImageWord(word)
            if (!key) throw new Error('Enter a word.')
            const { data: previous } = await supabase
                .from('word_images')
                .select('image_path')
                .eq('language', language)
                .eq('word', key)
                .maybeSingle()
            const { error } = await supabase.from('word_images').upsert(
                {
                    language,
                    word: key,
                    image_path: group.imagePath,
                    source: group.source,
                    credit: group.credit,
                    source_url: null,
                    reviewed: true,
                    reviewed_at: new Date().toISOString(),
                },
                { onConflict: 'language,word' },
            )
            if (error) throw error
            if (previous && previous.image_path !== group.imagePath) await removeFileIfUnused(previous.image_path)
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['word_images'] }),
    })
}

// Takes one word off a picture. If that was the picture's last word the
// file goes too.
export function useRemoveWordMutation() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ group, wordId }: { group: PictureGroup; wordId: string }) => {
            const { error } = await supabase.from('word_images').delete().eq('id', wordId)
            if (error) throw error
            await removeFileIfUnused(group.imagePath)
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['word_images'] }),
    })
}

// Removes the picture (and every word row that used it) — those words fall
// back to the placeholder in the notebook.
export function useDeletePictureMutation() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (group: PictureGroup) => {
            const { error } = await supabase.from('word_images').delete().eq('image_path', group.imagePath)
            if (error) throw error
            await removeFileIfUnused(group.imagePath)
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['word_images'] }),
    })
}
