// File: src/pages/proficiency/foundational/data/en/level4.ts
// English Level 4: long vowels (silent e and vowel teams).
import { wordsFromRows, type FoundationalLevel, type WordRow } from '../types.ts'

const ROWS: WordRow[] = [
    // a_e
    ['cake', 'a_e', '🍰', 'The cake is on the dish.', ['cane', 'cape']],
    ['snake', 'a_e', '🐍', 'The snake is in the grass.', ['snack', 'steak']],
    ['lake', 'a_e', '🏞️', 'The duck is on the lake.', ['like', 'lace']],
    // i_e
    ['bike', 'i_e', '🚲', 'The kid has a bike.', ['bake', 'bite']],
    ['five', 'i_e', '5️⃣', 'I see five ducks.', ['fine', 'fire']],
    ['nine', 'i_e', '9️⃣', 'I see nine bees.', ['nice', 'fine']],
    ['smile', 'i_e', '😊', 'The kid has a smile.', ['small', 'while']],
    // o_e
    ['bone', 'o_e', '🦴', 'The dog has a bone.', ['bond', 'cone']],
    ['nose', 'o_e', '👃', 'My nose is red.', ['note', 'rose']],
    ['rose', 'o_e', '🌹', 'The rose is a flower.', ['rope', 'nose']],
    ['home', 'o_e', '🏠', 'The cat is in my home.', ['hope', 'hole']],
    // u_e
    ['cube', 'u_e', '🧊', 'The cube is in the box.', ['cute', 'cub']],
    ['flute', 'u_e', '🎶', 'The kid can play the flute.', ['fluke', 'float']],
    // ai
    ['rain', 'ai', '🌧️', 'The rain is on the road.', ['ran', 'rein']],
    ['train', 'ai', '🚆', 'I see a train and a bus.', ['drain', 'trap']],
    ['mail', 'ai', '📬', 'The mail is in the bag.', ['male', 'mall']],
    ['paint', 'ai', '🎨', 'The paint is blue.', ['faint', 'pint']],
    // ay
    ['day', 'ay', '🌞', 'I see the sun in the day.', ['dry', 'bay']],
    ['play', 'ay', '🤸', 'The kids play in the rain.', ['clay', 'pray']],
    ['hay', 'ay', '🌾', 'The goat is on the hay.', ['hey', 'ray']],
    // ee
    ['tree', 'ee', '🌳', 'The nest is in the tree.', ['free', 'three']],
    ['bee', 'ee', '🐝', 'The bee is on the rose.', ['see', 'bed']],
    ['feet', 'ee', '🦶', 'I see feet in the mud.', ['feed', 'fleet']],
    ['sleep', 'ee', '😴', 'The cat can sleep on the bed.', ['sheep', 'slip']],
    // ea
    ['leaf', 'ea', '🍃', 'The snail is on the leaf.', ['loaf', 'life']],
    ['bean', 'ea', '🫘', 'The bean is in the pot.', ['bone', 'been']],
    ['peach', 'ea', '🍑', 'The peach is on the dish.', ['beach', 'teach']],
    // oa / ow
    ['boat', 'oa', '⛵', 'The boat is on the lake.', ['coat', 'goat']],
    ['road', 'oa', '🛣️', 'The bus is on the road.', ['load', 'toad']],
    ['cow', 'ow', '🐄', 'The cow is in the grass.', ['how', 'bow']],
]

export const EN_LEVEL_4: FoundationalLevel = {
    id: 'english-4',
    language: 'en',
    level: 4,
    title: 'Long Vowels',
    subtitle: 'English · Level 4',
    summary: 'Read words with silent e and vowel teams like cake, bike, rain, boat and tree.',
    words: wordsFromRows('en', 4, ROWS),
}
