// File: src/pages/proficiency/foundational/data/en/level5.ts
// English Level 5: sight words and short sentences.
import {
    wordsFromRows,
    type FoundationalLevel,
    type FoundationalSentence,
    type WordRow,
} from '../types.ts'

// Sight words have no picture to show, so they all share one neutral emoji.
const SIGHT = '🔤'

const ROWS: WordRow[] = [
    ['the', 'sight word', SIGHT, 'The cat is in the box.', ['then', 'they']],
    ['was', 'sight word', SIGHT, 'The bus was in the mud.', ['saw', 'has']],
    ['said', 'sight word', SIGHT, 'The kid said, "I can see a kite."', ['sad', 'say']],
    ['you', 'sight word', SIGHT, 'I can see you.', ['your', 'yes']],
    ['are', 'sight word', SIGHT, 'You are my sun.', ['air', 'art']],
    ['they', 'sight word', SIGHT, 'They have a boat.', ['the', 'then']],
    ['have', 'sight word', SIGHT, 'I have a kite.', ['has', 'hive']],
    ['with', 'sight word', SIGHT, 'The dog is with the kid.', ['wish', 'will']],
    ['what', 'sight word', SIGHT, 'What is in the box?', ['that', 'when']],
    ['were', 'sight word', SIGHT, 'They were in the rain.', ['where', 'was']],
    ['there', 'sight word', SIGHT, 'There is a bee on the rose.', ['three', 'these']],
    ['come', 'sight word', SIGHT, 'Come and see the sampaguita.', ['came', 'home']],
    ['some', 'sight word', SIGHT, 'I have some rice.', ['same', 'sum']],
    ['to', 'sight word', SIGHT, 'The kid can go to the shop.', ['too', 'two']],
    ['of', 'sight word', SIGHT, 'I see a bag of rice.', ['off', 'on']],
    ['from', 'sight word', SIGHT, 'The mango is from the tree.', ['form', 'farm']],
    ['one', 'sight word', SIGHT, 'I see one kite.', ['once', 'on']],
    ['two', 'sight word', SIGHT, 'The hen has two chicks.', ['to', 'too']],
    ['who', 'sight word', SIGHT, 'Who has the cake?', ['how', 'whom']],
    ['this', 'sight word', SIGHT, 'This is my bike.', ['that', 'thus']],
    ['that', 'sight word', SIGHT, 'That is a jeepney.', ['this', 'than']],
    ['my', 'sight word', SIGHT, 'My cat is black.', ['me', 'may']],
    ['go', 'sight word', SIGHT, 'We go in the boat.', ['no', 'so']],
    ['we', 'sight word', SIGHT, 'We can play.', ['he', 'me']],
    ['he', 'sight word', SIGHT, 'He has a bike.', ['she', 'we']],
    ['she', 'sight word', SIGHT, 'She has a rose.', ['he', 'shed']],
    ['like', 'sight word', SIGHT, 'I like mango.', ['lake', 'look']],
    ['look', 'sight word', SIGHT, 'Look in the box.', ['book', 'like']],
    ['for', 'sight word', SIGHT, 'The cake is for you.', ['far', 'four']],
    ['all', 'sight word', SIGHT, 'All the ducks are in the lake.', ['ball', 'tall']],
]

// [text, emoji]
const SENTENCE_ROWS: [string, string][] = [
    ['The cat is on the bed.', '🐱'],
    ['I have a red kite.', '🪁'],
    ['The dog was in the bath.', '🛁'],
    ['The carabao was in the mud.', '🐃'],
    ['You are my sun.', '☀️'],
    ['What is in the box?', '📦'],
    ['The hen said, "Look in the nest."', '🐔'],
    ['Who has the mango?', '🥭'],
    ['I like rice with fish.', '🍚'],
    ['The jeepney and the bus stop on the road.', '🚌'],
]

const sentences: FoundationalSentence[] = SENTENCE_ROWS.map(([text, image], index) => ({
    id: `en-l5-sentence-${index + 1}`,
    language: 'en',
    level: 5,
    text,
    phonics_focus: 'sight words',
    image,
    audio: '',
}))

export const EN_LEVEL_5: FoundationalLevel = {
    id: 'english-5',
    language: 'en',
    level: 5,
    title: 'Sight Words & Sentences',
    subtitle: 'English · Level 5',
    summary: 'Learn common sight words like the, was, said and you, then read short sentences.',
    words: wordsFromRows('en', 5, ROWS),
    sentences,
}
