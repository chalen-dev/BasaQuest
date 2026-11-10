// File: src/pages/proficiency/foundational/data/fil/level3.ts
// Filipino Antas 3: salitang may pantig na may katinig sa dulo (closed syllables like
// lap-is, pin-to, gun-ting) and the diphthongs aw, ay, iw (a-raw, ba-hay, i-law). Every word is
// built from sounds taught in Antas 1 and 2. Sentences use the words of Antas 2 and 3
// plus the little function words (ang, ay, may, nasa, na).
import { wordsFromRows, type FoundationalLevel, type WordRow } from '../types.ts'

const ROWS: WordRow[] = [
    // pantig na may katinig sa dulo
    ['lapis', 'pantig: la-pis', '✏️', 'Ang bata ay may lapis.', ['lapit', 'lapad']],
    ['pinto', 'pantig: pin-to', '🚪', 'Ang pinto ay nasa bahay.', ['pinta', 'pinsan']],
    ['bundok', 'pantig: bun-dok', '⛰️', 'Ang bahay ay nasa bundok.', ['bunot', 'bundat']],
    ['kuting', 'pantig: ku-ting', '🐱', 'Ang kuting ay nasa kama.', ['kutis', 'kulting']],
    ['gunting', 'pantig: gun-ting', '✂️', 'Ang gunting ay nasa mesa.', ['guting', 'guntil']],
    ['mansanas', 'pantig: man-sa-nas', '🍎', 'Ang bata ay may mansanas.', ['mansana', 'mangas']],
    ['bangka', 'pantig: bang-ka', '⛵', 'Ang bangka ay nasa tubig.', ['bangko', 'banka']],
    ['silya', 'pantig: sil-ya', '🪑', 'Ang silya ay nasa bahay.', ['sinta', 'silid']],
    ['gamot', 'pantig: ga-mot', '💊', 'Ang gamot ay nasa mesa.', ['gabot', 'gatas']],
    ['aklat', 'pantig: ak-lat', '📖', 'Ang aklat ay nasa mesa.', ['aklas', 'alat']],
    ['sampu', 'pantig: sam-pu', '🔟', 'Ang bata ay may sampu na lapis.', ['sampo', 'sapat']],
    ['kandila', 'pantig: kan-di-la', '🕯️', 'Ang kandila ay nasa mesa.', ['kandado', 'kanila']],
    ['tinapay', 'pantig: ti-na-pay', '🍞', 'Ang tinapay ay nasa mesa.', ['tinapa', 'tindahan']],
    ['tuhod', 'pantig: tu-hod', '🦵', 'Ang bata ay may tuhod.', ['tubod', 'tuhog']],
    ['ngiti', 'pantig: ngi-ti', '😊', 'Ang bata ay may ngiti.', ['ngipin', 'niti']],
    ['bulaklak', 'pantig: bu-lak-lak', '🌸', 'Ang bulaklak ay nasa bahay.', ['bulalak', 'bulaklay']],
    ['bintana', 'pantig: bin-ta-na', '🪟', 'Ang bintana ay nasa bahay.', ['binata', 'bintang']],
    ['tindahan', 'pantig: tin-da-han', '🏪', 'Ang tindahan ay may tinapay.', ['tinapay', 'tinidor']],
    ['kamote', 'pantig: ka-mo-te', '🍠', 'Ang bata ay may kamote.', ['kamatis', 'kamate']],
    // diptonggo: aw, ay, iw
    ['bahay', 'diptonggo ay: ba-hay', '🏠', 'Ang bahay ay may pinto.', ['bahag', 'bahaw']],
    ['kamay', 'diptonggo ay: ka-may', '🖐️', 'Ang bata ay may kamay.', ['kamag', 'kamaw']],
    ['tulay', 'diptonggo ay: tu-lay', '🌉', 'Ang tulay ay may ilaw.', ['tulad', 'tulaw']],
    ['araw', 'diptonggo aw: a-raw', '☀️', 'Ang araw ay nasa bundok.', ['aray', 'arar']],
    ['ilaw', 'diptonggo aw: i-law', '💡', 'Ang ilaw ay nasa bahay.', ['ilay', 'ilag']],
    // mga salitang may dalawa o tatlong pantig
    ['itik', 'pantig: i-tik', '🦆', 'Ang itik ay nasa tubig.', ['itak', 'itim']],
    ['ibon', 'pantig: i-bon', '🐦', 'Ang ibon ay nasa bintana.', ['ibong', 'iboy']],
    ['itlog', 'pantig: it-log', '🥚', 'Ang itlog ay nasa mesa.', ['itlag', 'ilog']],
    ['ahas', 'pantig: a-has', '🐍', 'Ang ahas ay nasa bundok.', ['ahat', 'atas']],
    ['unan', 'pantig: u-nan', '🛏️', 'Ang unan ay nasa kama.', ['unas', 'uman']],
    ['damit', 'pantig: da-mit', '👕', 'Ang damit ay nasa kama.', ['damot', 'dalit']],
]

export const FIL_LEVEL_3: FoundationalLevel = {
    id: 'filipino-3',
    language: 'fil',
    level: 3,
    title: 'Mga Salitang may Katinig',
    subtitle: 'Filipino · Antas 3',
    summary: 'Basahin ang mga salitang may katinig sa dulo ng pantig, tulad ng lapis at pinto, at ang mga diptonggo tulad ng bahay at araw.',
    words: wordsFromRows('fil', 3, ROWS),
}
