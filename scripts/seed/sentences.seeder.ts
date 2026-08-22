// File: scripts/seed/sentences.seeder.ts
import { supabase } from '../client.ts'
const READING_SENTENCES: { sentence_set: string; sentence_number: number; display_order: number; text: string }[] = [
    { sentence_set: 'g1_2', sentence_number: 1, display_order: 1, text: 'Si Ana ay may aso.' },
    { sentence_set: 'g1_2', sentence_number: 2, display_order: 2, text: 'Ang pangalan ng aso ay Bantay.' },
    { sentence_set: 'g1_2', sentence_number: 3, display_order: 3, text: 'Tuwing umaga, naglalaro sila sa bakuran.' },
    { sentence_set: 'g1_2', sentence_number: 4, display_order: 4, text: 'Masaya si Ana kapag kasama niya si Bantay.' },
    { sentence_set: 'g1_2', sentence_number: 5, display_order: 5, text: 'Binibigyan niya ito ng pagkain at tubig bawat araw.' },
    { sentence_set: 'g1_2', sentence_number: 6, display_order: 6, text: 'Sa hapon, umuuwi sila sa bahay.' },
    { sentence_set: 'g1_2', sentence_number: 7, display_order: 7, text: 'Doon sila natutulog nang mahimbing.' },
    { sentence_set: 'g1_2', sentence_number: 8, display_order: 8, text: 'Si Juan ay may pusa.' },
    { sentence_set: 'g1_2', sentence_number: 9, display_order: 9, text: 'Pula ang bola ni Maria.' },
    { sentence_set: 'g1_2', sentence_number: 10, display_order: 10, text: 'Kumakain kami ng almusal tuwing umaga.' },
    { sentence_set: 'g1_2', sentence_number: 11, display_order: 11, text: 'Masaya ang mga bata sa parke.' },
    { sentence_set: 'g1_2', sentence_number: 12, display_order: 12, text: 'Tumutulong si Nena sa kanyang ina.' },
    { sentence_set: 'g1_2', sentence_number: 13, display_order: 13, text: 'Maganda ang panahon ngayong araw.' },
    { sentence_set: 'g3_4', sentence_number: 1, display_order: 1, text: 'May maliit na bahay sa tabi ng ilog.' },
    { sentence_set: 'g3_4', sentence_number: 2, display_order: 2, text: 'Doon nakatira ang pamilya ni Mario.' },
    { sentence_set: 'g3_4', sentence_number: 3, display_order: 3, text: 'Tuwing hapon, tumutulong siya sa kanyang ina na magluto ng hapunan.' },
    { sentence_set: 'g3_4', sentence_number: 4, display_order: 4, text: 'Pagkatapos, nagbabasa siya ng kanyang mga aralin sa tabi ng bintana.' },
    { sentence_set: 'g3_4', sentence_number: 5, display_order: 5, text: 'Gusto niyang maging guro balang araw upang matulungan ang mga bata sa kanilang nayon.' },
    { sentence_set: 'g3_4', sentence_number: 6, display_order: 6, text: 'Araw-araw, naglalakad si Pedro papuntang paaralan.' },
    { sentence_set: 'g3_4', sentence_number: 7, display_order: 7, text: 'Gustong-gusto ni Rosa ang magbasa ng mga kwento bago matulog.' },
    { sentence_set: 'g3_4', sentence_number: 8, display_order: 8, text: 'Ang mga ibon ay lumilipad papunta sa kanilang pugad.' },
    { sentence_set: 'g3_4', sentence_number: 9, display_order: 9, text: 'Tuwing Sabado, naglilinis kami ng bahay nang magkakasama.' },
]
export async function seedSentences() {
    console.log('Seeding reading sentences...')
    // upsert on the (sentence_set, sentence_number) unique constraint —
    // safe to re-run: re-seeding updates text/display_order in place
    // instead of erroring or duplicating rows. Requires
    // seedSentenceSets() to have already run in this process, since
    // sentence_set now has a foreign key into reading_sentence_sets.
    const { error } = await supabase
        .from('reading_sentences')
        .upsert(READING_SENTENCES, { onConflict: 'sentence_set,sentence_number' })
    if (error) {
        console.error(`  ✗ reading sentences: ${error.message}`)
        return
    }
    console.log(`  ✓ ${READING_SENTENCES.length} sentences (13 g1_2 + 9 g3_4)`)
}