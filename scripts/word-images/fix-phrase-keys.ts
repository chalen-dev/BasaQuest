// File: scripts/word-images/fix-phrase-keys.ts
// One-off clean-up for word rows that could never match a tapped word:
//
//  - "sa itaas" / "sa pagitan" / "sa labas" ... were imported as one key
//    ("saitaas"), but a pupil taps one word at a time, so they never matched.
//    Each is moved to its head word (itaas, pagitan, labas) or dropped when
//    that word already has its own picture (ibaba, likod, loob).
//  - top.png is ARASAAC's bottle cap, yet it carried "top", "itaas" and
//    "trumpo". It now says what it shows: "tansan".
//
// Safe to re-run. Points at the local stack by default; use ENV_FILE for the
// deployed project:
//
//   npx tsx scripts/word-images/fix-phrase-keys.ts
//   $env:ENV_FILE=".env.cloud.local"; npx tsx scripts/word-images/fix-phrase-keys.ts
import { supabase } from '../client.ts'

type Lang = 'en' | 'fil'

async function remove(language: Lang, word: string, imagePath?: string) {
    let q = supabase.from('word_images').delete().eq('language', language).eq('word', word)
    if (imagePath) q = q.eq('image_path', imagePath)
    const { data, error } = await q.select('id')
    if (error) throw error
    if (data.length) console.log(`  removed ${language}:${word}${imagePath ? ` from ${imagePath}` : ''}`)
}

async function rename(language: Lang, from: string, to: string) {
    const { data: target } = await supabase
        .from('word_images')
        .select('image_path')
        .eq('language', language)
        .eq('word', to)
        .maybeSingle()
    if (target) {
        // The head word already has a picture: just drop the dead phrase key.
        await remove(language, from)
        return
    }
    const { data, error } = await supabase
        .from('word_images')
        .update({ word: to, reviewed: false, reviewed_at: null })
        .eq('language', language)
        .eq('word', from)
        .select('image_path')
    if (error) throw error
    if (data.length) console.log(`  renamed ${language}:${from} -> ${to} (${data[0].image_path})`)
}

async function main() {
    console.log(`Fixing word rows on ${process.env.VITE_SUPABASE_URL}`)

    // 1. The bottle cap is a bottle cap (tansan), not "top" or a spinning top.
    // Give it its new word first so the picture is never left without rows.
    const { data: cap, error: capError } = await supabase
        .from('word_images')
        .select('credit, source_url')
        .eq('image_path', 'top.png')
        .limit(1)
    if (capError) throw capError
    if (cap.length) {
        const { error } = await supabase.from('word_images').upsert(
            {
                language: 'fil',
                word: 'tansan',
                image_path: 'top.png',
                source: 'arasaac',
                credit: cap[0].credit,
                source_url: cap[0].source_url,
                reviewed: false,
                reviewed_at: null,
            },
            { onConflict: 'language,word,sense' },
        )
        if (error) throw error
        console.log('  bottle cap picture answers to fil:tansan')
    } else {
        console.log('  top.png not found here (skipped the bottle cap)')
    }
    await remove('en', 'top', 'top.png')
    await remove('en', 'tops', 'top.png')
    await remove('fil', 'trumpo', 'top.png')
    await remove('fil', 'itaas', 'top.png')

    // 2. Phrases that were stored as one key ("sa itaas" -> "saitaas").
    await rename('fil', 'saitaas', 'itaas')
    await rename('fil', 'sapagitan', 'pagitan')
    await rename('fil', 'salabas', 'labas')
    await rename('fil', 'saibaba', 'ibaba')
    await rename('fil', 'salikod', 'likod')
    await rename('fil', 'saloob', 'loob')
    await rename('fil', 'saharap', 'harap')
    console.log('Done.')
}

main().catch((err) => {
    console.error(err instanceof Error ? err.message : err)
    process.exit(1)
})
