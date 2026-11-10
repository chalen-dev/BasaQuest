// File: src/pages/proficiency/foundational/data/fil/level4.ts
// Filipino Antas 4: kambal-katinig (two consonants said together, as in pla-to, gri-po, tren,
// kla-se, bra-so) and the digraph ts (tsi-ne-las). Words with kw (kwar-to) are included too. All
// are words children meet at home and in school. Sentences use the words of Antas 2-4
// plus the little function words (ang, ay, may, nasa, na).
import { wordsFromRows, type FoundationalLevel, type WordRow } from '../types.ts'

const ROWS: WordRow[] = [
    // pl, bl, kl
    ['plato', 'kambal-katinig pl: pla-to', '🍽️', 'Ang plato ay nasa mesa.', ['palato', 'pato']],
    ['plorera', 'kambal-katinig pl: plo-re-ra', '💐', 'Ang plorera ay may bulaklak.', ['polera', 'plano']],
    ['bloke', 'kambal-katinig bl: blo-ke', '🧱', 'Ang bloke ay nasa mesa.', ['boke', 'blusa']],
    ['blusa', 'kambal-katinig bl: blu-sa', '👚', 'Ang blusa ay nasa kama.', ['busa', 'bloke']],
    ['klase', 'kambal-katinig kl: kla-se', '🏫', 'Ang bata ay nasa klase.', ['kase', 'klima']],
    // gr, pr
    ['gripo', 'kambal-katinig gr: gri-po', '🚰', 'Ang gripo ay may tubig.', ['gipo', 'grupo']],
    ['grupo', 'kambal-katinig gr: gru-po', '👥', 'Ang grupo ay nasa klase.', ['gupo', 'gripo']],
    ['prutas', 'kambal-katinig pr: pru-tas', '🍎', 'Ang prutas ay nasa mesa.', ['putas', 'prito']],
    ['prito', 'kambal-katinig pr: pri-to', '🍳', 'Ang isda ay prito.', ['pito', 'prutas']],
    ['prinsesa', 'kambal-katinig pr: prin-se-sa', '👸', 'Ang prinsesa ay nasa bahay.', ['pinsesa', 'prinsipe']],
    // tr
    ['tren', 'kambal-katinig tr: tren', '🚆', 'Ang tren ay nasa tulay.', ['ten', 'trak']],
    ['trak', 'kambal-katinig tr: trak', '🚚', 'Ang trak ay nasa tulay.', ['tak', 'tren']],
    ['traysikel', 'kambal-katinig tr: tray-si-kel', '🛺', 'Ang traysikel ay nasa tindahan.', ['taysikel', 'trak']],
    ['trapo', 'kambal-katinig tr: tra-po', '🧽', 'Ang trapo ay nasa mesa.', ['tapo', 'trapal']],
    // br, kr, dr
    ['brotsa', 'kambal-katinig br: brot-sa', '🪥', 'Ang brotsa ay nasa mesa.', ['botsa', 'brasa']],
    ['braso', 'kambal-katinig br: bra-so', '💪', 'Ang bata ay may braso.', ['baso', 'brasa']],
    ['krayola', 'kambal-katinig kr: kra-yo-la', '🖍️', 'Ang bata ay may krayola.', ['kayola', 'krayon']],
    ['krus', 'kambal-katinig kr: krus', '✝️', 'Ang krus ay nasa bundok.', ['kus', 'kuros']],
    ['drayber', 'kambal-katinig dr: dray-ber', '🚗', 'Ang drayber ay nasa trak.', ['dayber', 'drayver']],
    ['drum', 'kambal-katinig dr: drum', '🥁', 'Ang bata ay may drum.', ['dum', 'drim']],
    ['dragon', 'kambal-katinig dr: dra-gon', '🐉', 'Ang dragon ay nasa bundok.', ['dagon', 'dragin']],
    // kw
    ['kwarto', 'kw: kwar-to', '🛌', 'Ang kama ay nasa kwarto.', ['karto', 'kwanto']],
    ['kwintas', 'kw: kwin-tas', '📿', 'Ang bata ay may kwintas.', ['kintas', 'kwitas']],
    ['kwento', 'kw: kwen-to', '📖', 'Ang aklat ay may kwento.', ['kento', 'kwenta']],
    ['kwago', 'kw: kwa-go', '🦉', 'Ang kwago ay nasa bintana.', ['kago', 'kwatro']],
    // ts, dy
    ['tsinelas', 'ts: tsi-ne-las', '🩴', 'Ang tsinelas ay nasa kama.', ['sinelas', 'tinelas']],
    ['tsokolate', 'ts: tso-ko-la-te', '🍫', 'Ang bata ay may tsokolate.', ['sokolate', 'tokolate']],
    ['tsaa', 'ts: tsa-a', '🍵', 'Ang tsaa ay nasa tasa.', ['saa', 'taa']],
    ['tsuper', 'ts: tsu-per', '🚖', 'Ang tsuper ay nasa traysikel.', ['super', 'tuper']],
    ['diyaryo', 'iy: di-yar-yo', '📰', 'Ang diyaryo ay nasa mesa.', ['diaryo', 'diyaro']],
]

export const FIL_LEVEL_4: FoundationalLevel = {
    id: 'filipino-4',
    language: 'fil',
    level: 4,
    title: 'Kambal-Katinig',
    subtitle: 'Filipino · Antas 4',
    summary: 'Basahin ang mga salitang may kambal-katinig, tulad ng plato, gripo, tren at klase, at ang ts at kw.',
    words: wordsFromRows('fil', 4, ROWS),
}
