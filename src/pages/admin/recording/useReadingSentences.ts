// File: src/pages/admin/recording/useReadingSentences.ts
// Loads the reading script from the `reading_sentences` table (seeded via
// scripts/seed/sentences.seeder.ts) instead of a hardcoded array, so it can
// be edited/reseeded without a frontend code change.
import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabaseClient'

export type SentenceSet = 'g1_2' | 'g3_4'

export type Sentence = {
    number: number
    text: string
}

export const SENTENCE_SET_LABELS: Record<SentenceSet, string> = {
    g1_2: 'Grade 1-2 script',
    g3_4: 'Grade 3-4 script',
}

export function useReadingSentences() {
    const [sentencesBySet, setSentencesBySet] = useState<Record<SentenceSet, Sentence[]>>({
        g1_2: [],
        g3_4: [],
    })
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        supabase
            .from('reading_sentences')
            .select('sentence_set, sentence_number, text')
            .order('sentence_set', { ascending: true })
            .order('sentence_number', { ascending: true })
            .then(({ data, error: fetchError }) => {
                if (cancelled) return
                if (fetchError) {
                    console.error('useReadingSentences: failed to load sentences', fetchError)
                    setError(fetchError.message)
                    setLoading(false)
                    return
                }
                const grouped: Record<SentenceSet, Sentence[]> = { g1_2: [], g3_4: [] }
                for (const row of data ?? []) {
                    const set = row.sentence_set as SentenceSet
                    if (!grouped[set]) continue
                    grouped[set].push({ number: row.sentence_number, text: row.text })
                }
                setSentencesBySet(grouped)
                setLoading(false)
            })
        return () => {
            cancelled = true
        }
    }, [])

    return { sentencesBySet, loading, error }
}