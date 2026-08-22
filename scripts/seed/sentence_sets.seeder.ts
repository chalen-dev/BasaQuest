// File: scripts/seed/sentence_sets.seeder.ts
import { supabase } from '../client.ts'
const READING_SENTENCE_SETS: { key: string; label: string; sort_order: number }[] = [
    { key: 'g1_2', label: 'Grade 1-2 script', sort_order: 1 },
    { key: 'g3_4', label: 'Grade 3-4 script', sort_order: 2 },
]
export async function seedSentenceSets() {
    console.log('Seeding reading sentence sets...')
    // upsert on the key primary key — safe to re-run: re-seeding updates
    // the label/sort_order in place instead of erroring or duplicating.
    // Must run before seedSentences(): reading_sentences.sentence_set now
    // has a foreign key into this table.
    const { error } = await supabase
        .from('reading_sentence_sets')
        .upsert(READING_SENTENCE_SETS, { onConflict: 'key' })
    if (error) {
        console.error(`  ✗ reading sentence sets: ${error.message}`)
        return
    }
    console.log(`  ✓ ${READING_SENTENCE_SETS.length} sentence sets`)
}