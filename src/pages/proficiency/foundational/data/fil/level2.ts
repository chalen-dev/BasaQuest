// File: src/pages/proficiency/foundational/data/fil/level2.ts
// Filipino Antas 2: Mga Pantig at Salita. Two-syllable words made only of open syllables
// (consonant + vowel, like ba-ta, ka-pe, bo-la), so a child can read each syllable and join
// them. The syllable breakdown is in `phonics_focus`. Sentences use only words of this level
// plus the little function words (ang, ay, may, nasa, na).
import { wordsFromRows, type FoundationalLevel, type WordRow } from '../types.ts'

const ROWS: WordRow[] = [
    // a
    ['bata', 'pantig: ba-ta', '🧒', 'Ang bata ay may bola.', ['bota', 'bana']],
    ['mata', 'pantig: ma-ta', '👁️', 'Ang bata ay may mata.', ['mama', 'mesa']],
    ['kama', 'pantig: ka-ma', '🛏️', 'Ang bata ay nasa kama.', ['kana', 'kamay']],
    ['lata', 'pantig: la-ta', '🥫', 'Ang lata ay nasa mesa.', ['lota', 'lana']],
    ['baka', 'pantig: ba-ka', '🐄', 'Ang baka ay may mata.', ['bata', 'buka']],
    ['saba', 'pantig: sa-ba', '🍌', 'Ang bata ay may saba.', ['sama', 'sabi']],
    ['daga', 'pantig: da-ga', '🐭', 'Ang daga ay nasa kama.', ['dala', 'dagat']],
    // e
    ['kape', 'pantig: ka-pe', '☕', 'Ang kape ay nasa tasa.', ['kapa', 'kopa']],
    ['bote', 'pantig: bo-te', '🍾', 'Ang bote ay nasa mesa.', ['bota', 'boto']],
    ['sine', 'pantig: si-ne', '🎬', 'Ang bata ay nasa sine.', ['sina', 'sino']],
    ['pera', 'pantig: pe-ra', '💵', 'Ang bata ay may pera.', ['pira', 'pela']],
    ['mesa', 'pantig: me-sa', '🍽️', 'Ang bola ay nasa mesa.', ['masa', 'misa']],
    ['tasa', 'pantig: ta-sa', '🍵', 'Ang tasa ay nasa mesa.', ['tama', 'tata']],
    // i
    ['bibe', 'pantig: bi-be', '🦆', 'Ang bibe ay may mata.', ['bibi', 'babe']],
    ['dila', 'pantig: di-la', '👅', 'Ang bata ay may dila.', ['dilo', 'dala']],
    ['mani', 'pantig: ma-ni', '🥜', 'Ang bata ay may mani.', ['mana', 'mini']],
    ['sili', 'pantig: si-li', '🌶️', 'Ang sili ay nasa mesa.', ['sala', 'silo']],
    ['lima', 'pantig: li-ma', '5️⃣', 'Ang bata ay may lima na saba.', ['lama', 'limo']],
    ['hari', 'pantig: ha-ri', '🤴', 'Ang hari ay may pera.', ['hali', 'hara']],
    // o
    ['bola', 'pantig: bo-la', '⚽', 'Ang bola ay nasa kama.', ['bula', 'bolo']],
    ['lobo', 'pantig: lo-bo', '🎈', 'Ang bata ay may lobo.', ['lubo', 'lopo']],
    ['sopa', 'pantig: so-pa', '🍲', 'Ang sopa ay nasa mesa.', ['sapa', 'soba']],
    ['tobo', 'pantig: to-bo', '🪣', 'Ang tobo ay nasa mesa.', ['tubo', 'tabo']],
    // u
    ['puso', 'pantig: pu-so', '❤️', 'Ang bata ay may puso.', ['piso', 'pusa']],
    ['buko', 'pantig: bu-ko', '🥥', 'Ang buko ay nasa mesa.', ['buka', 'buho']],
    ['tubo', 'pantig: tu-bo', '🚰', 'Ang bata ay may tubo.', ['tabo', 'tuba']],
    ['buto', 'pantig: bu-to', '🦴', 'Ang baka ay may buto.', ['bato', 'buti']],
    ['kuko', 'pantig: ku-ko', '💅', 'Ang bata ay may kuko.', ['kuku', 'kako']],
    ['puti', 'pantig: pu-ti', '⚪', 'Ang bola ay puti.', ['pati', 'puto']],
    ['ubo', 'pantig: u-bo', '🤧', 'Ang bata ay may ubo.', ['obo', 'uba']],
]

export const FIL_LEVEL_2: FoundationalLevel = {
    id: 'filipino-2',
    language: 'fil',
    level: 2,
    title: 'Mga Pantig at Salita',
    subtitle: 'Filipino · Antas 2',
    summary: 'Basahin ang mga salitang may dalawang pantig, tulad ng ba-ta, ka-pe at bo-la.',
    words: wordsFromRows('fil', 2, ROWS),
}
