// File: src/pages/admin/recording/useReadingSentences.ts
import { useQuery } from '@tanstack/react-query'
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

export const readingSentencesKey = ['reading_sentences'] as const

export function useReadingSentencesQuery() {
    return useQuery({
        queryKey: readingSentencesKey,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('reading_sentences')
                .select('sentence_set, sentence_number, text')
                .order('sentence_set', { ascending: true })
                .order('sentence_number', { ascending: true })
            if (error) throw error
            const grouped: Record<SentenceSet, Sentence[]> = { g1_2: [], g3_4: [] }
            for (const row of data ?? []) {
                const set = row.sentence_set as SentenceSet
                if (!grouped[set]) continue
                grouped[set].push({ number: row.sentence_number, text: row.text })
            }
            return grouped
        },
    })
}