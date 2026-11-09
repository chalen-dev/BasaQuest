// File: src/pages/proficiency/foundational/hooks.ts
//
// Data layer for the editable Foundational cards (supabase migration
// 20261109000000_create_foundational_cards.sql). A "set" is one version of a
// level's cards: the shared default (owner null) or a teacher's own. Which set
// a person gets:
//   pupil          their teacher's set if the teacher made one, else the default
//   teacher/admin  their own set if they made one, else the default
// The editor edits the default for an admin and the teacher's own set for a
// teacher. When the tables are missing or unreadable the queries error and the
// scene falls back to the built-in data in data/en/level1.ts.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../lib/supabaseClient.ts'
import { useProfile, type Profile } from '../../../hooks/useProfile.ts'
import { normalizeImageWord } from '../../../hooks/useWordImage.ts'
import type { FoundationalLetter } from './data/types.ts'

export type FoundationalSetRow = { id: string; level_key: string; owner_id: string | null }
export type FoundationalCardRow = {
    id: string
    set_id: string
    letter: string
    position: number
    word: string
    emoji: string
}
export type SetSource = 'default' | 'mine' | 'teacher'
export type ResolvedSet = { set: FoundationalSetRow; source: SetSource; cards: FoundationalCardRow[] }

const CARD_COLUMNS = 'id, set_id, letter, position, word, emoji'
const KEY = ['foundational'] as const

export function pickSet(sets: FoundationalSetRow[], profile: Profile): { set: FoundationalSetRow; source: SetSource } | null {
    if (profile.role === 'student') {
        const teachers = profile.teacher_id ? sets.find((s) => s.owner_id === profile.teacher_id) : undefined
        if (teachers) return { set: teachers, source: 'teacher' }
    } else {
        const mine = sets.find((s) => s.owner_id === profile.id)
        if (mine) return { set: mine, source: 'mine' }
    }
    const shared = sets.find((s) => s.owner_id === null)
    return shared ? { set: shared, source: 'default' } : null
}

async function fetchSets(levelKey: string): Promise<FoundationalSetRow[]> {
    const { data, error } = await supabase.from('foundational_sets').select('id, level_key, owner_id').eq('level_key', levelKey)
    if (error) throw error
    return (data ?? []) as FoundationalSetRow[]
}

async function fetchCards(setId: string): Promise<FoundationalCardRow[]> {
    const { data, error } = await supabase
        .from('foundational_cards')
        .select(CARD_COLUMNS)
        .eq('set_id', setId)
        .order('letter', { ascending: true })
        .order('position', { ascending: true })
    if (error) throw error
    return (data ?? []) as FoundationalCardRow[]
}

// The cards this person should see for a level; null when there is no set yet.
export function useFoundationalSetQuery(levelKey: string) {
    const { profile } = useProfile()
    return useQuery({
        queryKey: [...KEY, 'resolved', levelKey, profile?.id, profile?.teacher_id] as const,
        enabled: !!profile,
        retry: false,
        staleTime: 60_000,
        queryFn: async (): Promise<ResolvedSet | null> => {
            const picked = pickSet(await fetchSets(levelKey), profile as Profile)
            if (!picked) return null
            return { ...picked, cards: await fetchCards(picked.set.id) }
        },
    })
}

export type EditorState = {
    defaultSet: FoundationalSetRow | null
    mySet: FoundationalSetRow | null
    // The set the person edits: the default for an admin, their own for a teacher (null until they copy it).
    target: FoundationalSetRow | null
    cards: FoundationalCardRow[]
}

export function useFoundationalEditorQuery(levelKey: string) {
    const { profile } = useProfile()
    return useQuery({
        queryKey: [...KEY, 'editor', levelKey, profile?.id] as const,
        enabled: !!profile && (profile.role === 'teacher' || profile.role === 'admin'),
        retry: false,
        queryFn: async (): Promise<EditorState> => {
            const sets = await fetchSets(levelKey)
            const defaultSet = sets.find((s) => s.owner_id === null) ?? null
            const mySet = sets.find((s) => s.owner_id === (profile as Profile).id) ?? null
            const target = (profile as Profile).role === 'admin' ? defaultSet : mySet
            return { defaultSet, mySet, target, cards: target ? await fetchCards(target.id) : [] }
        },
    })
}

// Pictures from the Word Pictures library for these words (English), by word. A word's default
// picture wins, else any. Words with none are simply absent.
// Words the library stores under another name. The key is the normalized word, the value the
// library's own spelling (it also keeps some two-word entries with the space).
export const PICTURE_ALIASES: Record<string, string> = { yam: 'sweet potato' }
// Words the scene draws itself even when the library has a picture (the library's jeepney is a street
// photo, its water buffalo a boat, its box a boxing glove). Keep in step with PREFER_DRAWING in public/letters-practice.html.
export const PREFER_DRAWING = new Set(['carabao', 'jeepney', 'box'])

export function useLibraryPicturesQuery(words: string[]) {
    const wanted = words.map(normalizeImageWord).filter(Boolean)
    const keys = [...new Set([...wanted, ...wanted.map((w) => PICTURE_ALIASES[w]).filter(Boolean)])].sort()
    return useQuery({
        queryKey: [...KEY, 'library', keys.join('|')] as const,
        enabled: keys.length > 0,
        staleTime: Infinity,
        retry: false,
        queryFn: async (): Promise<Record<string, string>> => {
            const found: Record<string, string> = {}
            for (let from = 0; from < keys.length; from += 100) {
                const { data, error } = await supabase
                    .from('word_images')
                    .select('word, image_path, is_default')
                    .eq('language', 'en')
                    .in('word', keys.slice(from, from + 100))
                if (error) throw error
                const rows = (data ?? []) as { word: string; image_path: string; is_default: boolean }[]
                for (const row of rows) {
                    if (found[row.word] && !row.is_default) continue
                    found[row.word] = supabase.storage.from('word-images').getPublicUrl(row.image_path).data.publicUrl
                }
            }
            return found
        },
    })
}

export type SceneLetter = {
    word: string
    sound: string
    image: string
    imageUrl: string
    extras: { word: string; image: string; imageUrl: string }[]
}

// The scene's A-Z list: each letter's objects from the set's cards (first = main word), the
// letter's sound from the built-in data, and the built-in words for a letter the set has no cards for.
export function buildSceneLetters(
    builtIn: FoundationalLetter[],
    cards: FoundationalCardRow[] | undefined,
    pictures: Record<string, string> | undefined,
): SceneLetter[] {
    const url = (word: string) => {
        const key = normalizeImageWord(word)
        return pictures?.[key] ?? pictures?.[PICTURE_ALIASES[key] ?? ''] ?? ''
    }
    return [...builtIn]
        .sort((a, b) => a.lower.localeCompare(b.lower))
        .map((letter) => {
            const own = (cards ?? []).filter((c) => c.letter === letter.lower).sort((a, b) => a.position - b.position)
            const objects = own.length
                ? own.map((c) => ({ word: c.word, image: c.emoji }))
                : [{ word: letter.word, image: letter.image }, ...(letter.extra_words ?? [])]
            const [main, ...rest] = objects
            return {
                word: main.word,
                sound: letter.letter_sound.replace(/\//g, ''),
                image: main.image,
                imageUrl: url(main.word),
                extras: rest.map((o) => ({ word: o.word, image: o.image, imageUrl: url(o.word) })),
            }
        })
}

export type DraftCard = { word: string; emoji: string }

// Replaces one letter's cards. New rows go in first and the old ones are deleted after, so a
// failure part-way never leaves the letter empty.
export function useSaveLetterMutation() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ setId, letter, items, oldIds }: { setId: string; letter: string; items: DraftCard[]; oldIds: string[] }) => {
            if (items.length > 0) {
                const rows = items.map((item, index) => ({
                    set_id: setId,
                    letter,
                    position: 1000 + index,
                    word: item.word.trim(),
                    emoji: item.emoji.trim(),
                }))
                const { error } = await supabase.from('foundational_cards').insert(rows)
                if (error) throw error
            }
            if (oldIds.length > 0) {
                const { error } = await supabase.from('foundational_cards').delete().in('id', oldIds)
                if (error) throw error
            }
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
    })
}

// A teacher's own copy of the default set.
export function useMakeMyCopyMutation(levelKey: string) {
    const queryClient = useQueryClient()
    const { profile } = useProfile()
    return useMutation({
        mutationFn: async (defaultSetId: string) => {
            if (!profile) throw new Error('Not signed in')
            const { data: created, error } = await supabase
                .from('foundational_sets')
                .insert({ level_key: levelKey, owner_id: profile.id })
                .select('id')
                .single()
            if (error) throw error
            const source = await fetchCards(defaultSetId)
            if (source.length > 0) {
                const { error: copyError } = await supabase.from('foundational_cards').insert(
                    source.map((c) => ({ set_id: created.id, letter: c.letter, position: c.position, word: c.word, emoji: c.emoji })),
                )
                if (copyError) throw copyError
            }
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
    })
}

export function useResetToDefaultMutation() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (setId: string) => {
            const { error } = await supabase.from('foundational_sets').delete().eq('id', setId)
            if (error) throw error
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
    })
}
