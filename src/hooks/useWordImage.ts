// File: src/hooks/useWordImage.ts
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient.ts'

export type WordImage = {
    url: string
    credit: string | null
}

const BUCKET = 'word-images'

// Same normalization pronounce-word's slugify() uses, so a passage token
// like "mangga," finds the stored "mangga".
export function normalizeImageWord(word: string): string {
    return word
        .toLowerCase()
        .replace(/[^\p{L}\p{N}']/gu, '')
        .replace(/'/g, '')
        .trim()
}

// Resolves to null when this word has no picture, so callers keep their
// placeholder. Pictures rarely change, so cache them for the session.
export function useWordImageQuery(word: string | null | undefined, language: 'en' | 'fil' | undefined) {
    const key = word ? normalizeImageWord(word) : ''
    return useQuery({
        queryKey: ['word_image', language, key] as const,
        enabled: key !== '' && !!language,
        staleTime: Infinity,
        queryFn: async (): Promise<WordImage | null> => {
            const { data, error } = await supabase
                .from('word_images')
                .select('image_path, credit')
                .eq('language', language as string)
                .eq('word', key)
                .maybeSingle()
            if (error) throw error
            if (!data) return null
            const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(data.image_path)
            return { url: pub.publicUrl, credit: data.credit }
        },
    })
}
