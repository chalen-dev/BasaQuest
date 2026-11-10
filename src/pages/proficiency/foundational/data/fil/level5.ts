// File: src/pages/proficiency/foundational/data/fil/level5.ts
// Filipino Antas 5: mga salitang madalas gamitin (ang, ng, sa, ay, mga ...) and short sentences.
// These little words appear in every sentence, so they are learned by sight. Names (Ana, Ben) and
// the words from Antas 1-4 are used to build the sentences.
import {
    wordsFromRows,
    type FoundationalLevel,
    type FoundationalSentence,
    type WordRow,
} from '../types.ts'

// Sight words have no picture to show, so they all share one neutral emoji.
const SIGHT = '🔤'

const ROWS: WordRow[] = [
    ['ang', 'salitang madalas gamitin', SIGHT, 'Ang bata ay nasa bahay.', ['ano', 'an']],
    ['ng', 'salitang madalas gamitin', SIGHT, 'Ang bola ng bata ay puti.', ['nga', 'na']],
    ['sa', 'salitang madalas gamitin', SIGHT, 'Ang bata ay may bola sa kama.', ['si', 'sila']],
    ['ay', 'salitang madalas gamitin', SIGHT, 'Ang bola ay puti.', ['at', 'ako']],
    ['mga', 'salitang madalas gamitin', SIGHT, 'Ang mga bata ay nasa klase.', ['mag', 'mana']],
    ['ako', 'salitang madalas gamitin', SIGHT, 'Ako ay may bola.', ['ika', 'ano']],
    ['ikaw', 'salitang madalas gamitin', SIGHT, 'Ikaw ay nasa bahay.', ['ilaw', 'ako']],
    ['siya', 'salitang madalas gamitin', SIGHT, 'Siya ay may lapis.', ['sila', 'sino']],
    ['ito', 'salitang madalas gamitin', SIGHT, 'Ito ay bola.', ['iyon', 'ilo']],
    ['iyon', 'salitang madalas gamitin', SIGHT, 'Iyon ay bahay.', ['ito', 'iyan']],
    ['may', 'salitang madalas gamitin', SIGHT, 'Ang bata ay may saba.', ['mag', 'mga']],
    ['at', 'salitang madalas gamitin', SIGHT, 'May bola at lobo ang bata.', ['ay', 'ata']],
    ['ni', 'salitang madalas gamitin', SIGHT, 'Ang lapis ni Ana ay nasa mesa.', ['si', 'na']],
    ['si', 'salitang madalas gamitin', SIGHT, 'Si Ana ay nasa klase.', ['ni', 'sa']],
    ['ko', 'salitang madalas gamitin', SIGHT, 'Ang bola ko ay puti.', ['ka', 'ho']],
    ['mo', 'salitang madalas gamitin', SIGHT, 'Ang lapis mo ay nasa mesa.', ['ko', 'ma']],
    ['kami', 'salitang madalas gamitin', SIGHT, 'Kami ay nasa klase.', ['kimi', 'kita']],
    ['tayo', 'salitang madalas gamitin', SIGHT, 'Tayo ay nasa bahay.', ['tato', 'tayu']],
    ['sila', 'salitang madalas gamitin', SIGHT, 'Sila ay nasa bangka.', ['siya', 'sala']],
    ['na', 'salitang madalas gamitin', SIGHT, 'Ang bata ay may sampu na lapis.', ['ni', 'ng']],
    ['pa', 'salitang madalas gamitin', SIGHT, 'Ang bata ay may bola pa.', ['ba', 'po']],
    ['din', 'salitang madalas gamitin', SIGHT, 'Ako din ay may bola.', ['rin', 'dun']],
    ['po', 'salitang madalas gamitin', SIGHT, 'Ito po ay lapis.', ['pa', 'pu']],
    ['opo', 'salitang madalas gamitin', SIGHT, 'Opo, ako ay nasa bahay.', ['oo', 'apo']],
    ['oo', 'salitang madalas gamitin', SIGHT, 'Oo, ito ay bola.', ['opo', 'ayo']],
    ['hindi', 'salitang madalas gamitin', SIGHT, 'Hindi ito mangga.', ['hindu', 'hinde']],
    ['ba', 'salitang madalas gamitin', SIGHT, 'Ito ba ay bola?', ['pa', 'da']],
    ['nasa', 'salitang madalas gamitin', SIGHT, 'Ang lapis ay nasa mesa.', ['nasi', 'masa']],
    ['para', 'salitang madalas gamitin', SIGHT, 'Ang tinapay ay para sa bata.', ['pera', 'parang']],
    ['rin', 'salitang madalas gamitin', SIGHT, 'Ako ay may bola rin.', ['din', 'ring']],
]

// [text, emoji]
const SENTENCE_ROWS: [string, string][] = [
    ['Ang bata ay may bola.', '⚽'],
    ['Si Ana ay nasa bahay.', '🏠'],
    ['Ang mga bata ay nasa klase.', '🏫'],
    ['Ako ay may lapis at aklat.', '✏️'],
    ['Ito ba ay bola?', '⚽'],
    ['Ang tinapay ay para sa bata.', '🍞'],
    ['Hindi ito mangga, ito ay saging.', '🍌'],
    ['Kami ay may saging at mangga.', '🥭'],
    ['Sila ay nasa bangka.', '⛵'],
    ['Opo, tayo ay nasa tindahan.', '🏪'],
]

const sentences: FoundationalSentence[] = SENTENCE_ROWS.map(([text, image], index) => ({
    id: `fil-l5-sentence-${index + 1}`,
    language: 'fil',
    level: 5,
    text,
    phonics_focus: 'pangungusap',
    image,
    audio: '',
}))

export const FIL_LEVEL_5: FoundationalLevel = {
    id: 'filipino-5',
    language: 'fil',
    level: 5,
    title: 'Mga Salita at Pangungusap',
    subtitle: 'Filipino · Antas 5',
    summary: 'Alamin ang mga salitang madalas gamitin, tulad ng ang, sa, ay at mga, at basahin ang mga maikling pangungusap.',
    words: wordsFromRows('fil', 5, ROWS),
    sentences,
}
