// File: src/pages/admin/useReadingSentences.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabaseClient.ts'
// Sentence sets ("scripts") used to be a hardcoded 'g1_2' | 'g3_4' union
// with labels in a source constant. They're admin-editable now (see
// SentenceScripts.tsx) — created, renamed, and deleted through the
// reading_sentence_sets table — so both the list of sets and their
// labels have to be fetched, not typed.
//
// Lives directly under admin/ (not admin/recording/) because it's
// consumed from four different subtrees now: recording/session/,
// recording/select_student/, recording_history/history/, and
// sentence_scripts/ — the same reason useFinetuneStudents.ts,
// useConsentFiles.ts, and useStudentRecordings.ts sit here too.
export type ReadingSentenceSet = {
    key: string
    label: string
    sort_order: number
}
export type Sentence = {
    id: string
    number: number // sentence_number — the STABLE identity a sentence keeps for life; student_recordings keys off this. Not shown/edited directly in the UI.
    text: string
    display_order: number // purely visual ordering — this is what reordering touches, never `number`
}
export const readingSentenceSetsKey = ['reading_sentence_sets'] as const
export function useReadingSentenceSetsQuery() {
    return useQuery({
        queryKey: readingSentenceSetsKey,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('reading_sentence_sets')
                .select('key, label, sort_order')
                .order('sort_order', { ascending: true })
                .order('label', { ascending: true })
            if (error) throw error
            return (data ?? []) as ReadingSentenceSet[]
        },
    })
}
export const readingSentencesKey = ['reading_sentences'] as const
// Grouped-by-set shape used by the recording flow (RecordSession,
// SelectStudent) — one query for every sentence across every set,
// bucketed by sentence_set. A set with zero sentences just doesn't get a
// key here, so callers should fall back to `?? []` when indexing in.
export function useReadingSentencesQuery() {
    return useQuery({
        queryKey: readingSentencesKey,
        queryFn: async () => {
            const { data, error } = await supabase
                .from('reading_sentences')
                .select('id, sentence_set, sentence_number, text, display_order')
                .order('sentence_set', { ascending: true })
                .order('display_order', { ascending: true })
            if (error) throw error
            const grouped: Record<string, Sentence[]> = {}
            for (const row of data ?? []) {
                const set = row.sentence_set as string
                if (!grouped[set]) grouped[set] = []
                grouped[set].push({ id: row.id, number: row.sentence_number, text: row.text, display_order: row.display_order })
            }
            return grouped
        },
    })
}
// Flat per-set list (with real ids) used by the Sentence Scripts admin
// page for CRUD + reordering — the grouped query above intentionally
// doesn't expose enough to edit/delete/reorder a specific row cleanly.
export function sentencesBySetKey(setKey: string) {
    return ['reading_sentences', 'by_set', setKey] as const
}
export function useSentencesForSetQuery(setKey: string | null) {
    return useQuery({
        queryKey: sentencesBySetKey(setKey ?? ''),
        queryFn: async () => {
            const { data, error } = await supabase
                .from('reading_sentences')
                .select('id, sentence_number, text, display_order')
                .eq('sentence_set', setKey as string)
                .order('display_order', { ascending: true })
            if (error) throw error
            return (data ?? []).map((r) => ({
                id: r.id,
                number: r.sentence_number,
                text: r.text,
                display_order: r.display_order,
            })) as Sentence[]
        },
        enabled: !!setKey,
    })
}
// Turns a display label into a stable slug for reading_sentence_sets.key
// (e.g. "Grade 5-6 script" -> "grade_5_6_script"). Falls back to "set" if
// the label is all punctuation/whitespace, and the mutation below appends
// a numeric suffix on collision so this never has to be perfect.
function slugify(label: string) {
    const base = label
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
    return base || 'set'
}
export function useCreateSentenceSetMutation() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (label: string) => {
            const trimmed = label.trim()
            if (!trimmed) throw new Error('Give the script a name.')
            const { data: existingSets, error: fetchErr } = await supabase
                .from('reading_sentence_sets')
                .select('key, sort_order')
            if (fetchErr) throw fetchErr
            const existingKeys = new Set((existingSets ?? []).map((s) => s.key))
            const base = slugify(trimmed)
            let key = base
            let suffix = 2
            while (existingKeys.has(key)) {
                key = `${base}_${suffix}`
                suffix += 1
            }
            const nextSortOrder = (existingSets ?? []).reduce((max, s) => Math.max(max, s.sort_order), 0) + 1
            const { data, error } = await supabase
                .from('reading_sentence_sets')
                .insert({ key, label: trimmed, sort_order: nextSortOrder })
                .select('key, label, sort_order')
                .single()
            if (error) throw error
            return data as ReadingSentenceSet
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: readingSentenceSetsKey })
        },
    })
}
export function useUpdateSentenceSetLabelMutation() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ key, label }: { key: string; label: string }) => {
            const trimmed = label.trim()
            if (!trimmed) throw new Error('The name cannot be empty.')
            const { error } = await supabase.from('reading_sentence_sets').update({ label: trimmed }).eq('key', key)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: readingSentenceSetsKey })
        },
    })
}
export function useDeleteSentenceSetMutation() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (key: string) => {
            // Cascades to reading_sentences via the FK added in the
            // reading_sentence_sets migration — student_recordings rows
            // that reference this key are untouched (no FK there).
            const { error } = await supabase.from('reading_sentence_sets').delete().eq('key', key)
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: readingSentenceSetsKey })
            queryClient.invalidateQueries({ queryKey: readingSentencesKey })
        },
    })
}
export function useCreateSentenceMutation(setKey: string | null) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (text: string) => {
            if (!setKey) throw new Error('No script selected.')
            const trimmed = text.trim()
            if (!trimmed) throw new Error('Sentence text cannot be empty.')
            const { data: existing, error: fetchErr } = await supabase
                .from('reading_sentences')
                .select('sentence_number, display_order')
                .eq('sentence_set', setKey)
            if (fetchErr) throw fetchErr
            const nextNumber = (existing ?? []).reduce((max, r) => Math.max(max, r.sentence_number), 0) + 1
            const nextDisplayOrder = (existing ?? []).reduce((max, r) => Math.max(max, r.display_order), 0) + 1
            const { error } = await supabase.from('reading_sentences').insert({
                sentence_set: setKey,
                sentence_number: nextNumber,
                display_order: nextDisplayOrder,
                text: trimmed,
            })
            if (error) throw error
        },
        onSuccess: () => {
            if (setKey) queryClient.invalidateQueries({ queryKey: sentencesBySetKey(setKey) })
            queryClient.invalidateQueries({ queryKey: readingSentencesKey })
        },
    })
}
export function useUpdateSentenceTextMutation(setKey: string | null) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, text }: { id: string; text: string }) => {
            const trimmed = text.trim()
            if (!trimmed) throw new Error('Sentence text cannot be empty.')
            const { error } = await supabase.from('reading_sentences').update({ text: trimmed }).eq('id', id)
            if (error) throw error
        },
        onSuccess: () => {
            if (setKey) queryClient.invalidateQueries({ queryKey: sentencesBySetKey(setKey) })
            queryClient.invalidateQueries({ queryKey: readingSentencesKey })
        },
    })
}
export function useDeleteSentenceMutation(setKey: string | null) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('reading_sentences').delete().eq('id', id)
            if (error) throw error
        },
        onSuccess: () => {
            if (setKey) queryClient.invalidateQueries({ queryKey: sentencesBySetKey(setKey) })
            queryClient.invalidateQueries({ queryKey: readingSentencesKey })
        },
    })
}
// Reassigns display_order for a whole set in one round trip via the
// reorder_reading_sentences DB function — see its comment in the
// migration for why this doesn't need the temp-offset dance a
// sentence_number reorder would.
export function useReorderSentencesMutation(setKey: string | null) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (orderedIds: string[]) => {
            const { error } = await supabase.rpc('reorder_reading_sentences', { p_ids: orderedIds })
            if (error) throw error
        },
        onSuccess: () => {
            if (setKey) queryClient.invalidateQueries({ queryKey: sentencesBySetKey(setKey) })
            queryClient.invalidateQueries({ queryKey: readingSentencesKey })
        },
    })
}
// Escape hatch for a locked script (one with recordings against it) —
// see duplicate_reading_sentence_set in the recording-lock migration.
// Runs as the calling admin (SECURITY INVOKER), so it's really just "do
// the insert-a-set-and-copy-its-sentences dance server-side in one round
// trip" rather than a privilege escalation.
export function useDuplicateSentenceSetMutation() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (sourceKey: string) => {
            const { data, error } = await supabase.rpc('duplicate_reading_sentence_set', { p_source_key: sourceKey })
            if (error) throw error
            return data as string // the new set's key
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: readingSentenceSetsKey })
            queryClient.invalidateQueries({ queryKey: readingSentencesKey })
        },
    })
}