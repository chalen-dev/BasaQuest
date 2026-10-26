// File: src/hooks/useWordImage.ts
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabaseClient.ts'
import { contextAround, normalizeImageWord, pickPicture } from '../lib/pictureSense.ts'

export { normalizeImageWord }

export type WordImage = {
    url: string
    credit: string | null
    // Which meaning was chosen ("spinning toy"); null for an ordinary one-picture word.
    sense: string | null
}

const BUCKET = 'word-images'

// The API caps one response at 1,000 rows no matter what .limit() asks for,
// and the bank holds several thousand word rows, so admin screens and the
// credits page read it a page at a time.
export async function fetchAllWordImageRows<T>(columns: string): Promise<T[]> {
    const PAGE = 1000
    const rows: T[] = []
    for (let from = 0; ; from += PAGE) {
        const { data, error } = await supabase
            .from('word_images')
            .select(columns)
            .order('id', { ascending: true })
            .range(from, from + PAGE - 1)
        if (error) throw error
        rows.push(...((data ?? []) as T[]))
        if (!data || data.length < PAGE) return rows
    }
}

// A word can have several pictures, one per sense (top = spinning toy / bottle
// cap / peak), and a phrase can have its own ("spinning top"). See
// src/lib/pictureSense.ts for how one is chosen.
type PictureRow = {
    image_path: string
    credit: string | null
    word: string
    sense: string
    cues: string[]
    is_default: boolean
}

const PICTURE_COLUMNS = 'image_path, credit, word, sense, cues, is_default'

// Resolves to null when this word has no picture, so callers keep their
// placeholder. `context` is the words of the page the word was tapped in; with
// it, phrases and cue words can choose the right picture. Pictures rarely
// change, so cache them for the session.
export function useWordImageQuery(
    word: string | null | undefined,
    language: 'en' | 'fil' | undefined,
    context?: string[],
) {
    const key = word ? normalizeImageWord(word) : ''
    const { phrases, nearby } = contextAround(key, context)
    const contextKey = `${phrases.join('|')}#${nearby.join('|')}`
    return useQuery({
        queryKey: ['word_image', language, key, contextKey] as const,
        enabled: key !== '' && !!language,
        staleTime: Infinity,
        queryFn: async (): Promise<WordImage | null> => {
            const toImage = (row: PictureRow): WordImage => ({
                url: supabase.storage.from(BUCKET).getPublicUrl(row.image_path).data.publicUrl,
                credit: row.credit,
                sense: row.sense || null,
            })

            if (phrases.length > 0) {
                const { data, error } = await supabase
                    .from('word_images')
                    .select(PICTURE_COLUMNS)
                    .eq('language', language as string)
                    .in('word', phrases)
                if (error) throw error
                const rows = (data ?? []) as PictureRow[]
                for (const phrase of phrases) {
                    const hit = rows.find((row) => row.word === phrase)
                    if (hit) return toImage(hit)
                }
            }

            const { data, error } = await supabase
                .from('word_images')
                .select(PICTURE_COLUMNS)
                .eq('language', language as string)
                .eq('word', key)
            if (error) throw error
            const picked = pickPicture((data ?? []) as PictureRow[], nearby)
            return picked ? toImage(picked) : null
        },
    })
}
