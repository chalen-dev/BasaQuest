// File: scripts/word-images/add-filipino-words.ts
// Adds Filipino words to pictures that only had English ones. Each line says
// "the picture of this English word also answers to these Filipino words" —
// the picture is found through the English word, so no image is downloaded
// again; only word rows are added.
//
// Includes everyday English loanwords that Filipino text spells the same way
// (pizza, laptop, bus), since a Filipino story containing "pizza" should show
// the picture too.
//
// Safe to re-run, and it never overwrites: a Filipino word that already has a
// picture (araw = sun, bata = child...) is left alone and reported.
//
//   npx tsx scripts/word-images/add-filipino-words.ts [--dry-run]
//   $env:ENV_FILE=".env.cloud.local"; npx tsx scripts/word-images/add-filipino-words.ts
import { supabase } from '../client.ts'

// english word on the picture -> Filipino words, separated by ";"
const ADDITIONS: [string, string][] = [
    ['airconditioner', 'aircon'],
    ['apartment', 'apartment'],
    ['apricot', 'aprikot'],
    ['backpack', 'backpack'],
    ['bacon', 'bacon'],
    ['badminton', 'badminton'],
    ['balloon', 'lobo'],
    ['band', 'banda'],
    ['baseball', 'baseball;beysbol'],
    ['bathtub', 'banyera;bathtub'],
    ['beef', 'beef'],
    ['belly', 'tiyan'],
    ['berry', 'berry'],
    ['blender', 'blender'],
    ['bring', 'dala;magdala;nagdala;dalhin;dinala'],
    ['broccoli', 'broccoli'],
    ['bus', 'bus'],
    ['calculator', 'calculator;kalkulador'],
    ['canoe', 'kano'],
    ['cauliflower', 'cauliflower'],
    ['celery', 'celery'],
    ['chess', 'ahedres;chess'],
    ['chopsticks', 'chopsticks'],
    ['closet', 'aparador;closet'],
    ['coach', 'coach'],
    ['coke', 'coke'],
    ['cone', 'cone'],
    ['cookie', 'cookie;biskwit'],
    ['cupcake', 'cupcake'],
    ['day', 'araw'],
    ['desk', 'desk'],
    ['diamond', 'diyamante;diamond'],
    ['difficult', 'mahirap'],
    ['donut', 'donut'],
    ['elevator', 'elevator;lift'],
    ['feel', 'pakiramdam;nararamdaman;naramdaman;maramdaman'],
    ['fig', 'igos'],
    ['football', 'football'],
    ['fun', 'saya'],
    ['fur', 'balahibo'],
    ['goal', 'layunin;goal'],
    ['great', 'magaling;mahusay'],
    ['hamburger', 'hamburger'],
    ['hat', 'sumbrero;sombrero'],
    ['highway', 'highway'],
    ['hop', 'lundag;talon'],
    ['hot', 'mainit'],
    ['hotdog', 'hotdog'],
    ['jam', 'jam'],
    ['jeans', 'maong;jeans'],
    ['joy', 'tuwa;kasiyahan'],
    ['jungle', 'gubat'],
    ['kettle', 'takure;kettle'],
    ['keyboard', 'keyboard'],
    ['kiwi', 'kiwi'],
    ['know', 'alam;alamin;nalalaman'],
    ['laptop', 'laptop'],
    ['later', 'mamaya'],
    ['lemonade', 'limonada;lemonade'],
    ['lift', 'buhat;buhatin;binuhat;nagbuhat'],
    ['log', 'troso'],
    ['lollipop', 'lollipop'],
    ['lonely', 'malungkot'],
    ['look', 'tingin;tingnan;tumingin;tinitingnan'],
    ['lunchbox', 'baunan;lunchbox'],
    ['microphone', 'mikropono;microphone;mic'],
    ['month', 'buwan'],
    ['orchestra', 'orkestra;orchestra'],
    ['oven', 'hurno;oven'],
    ['pasta', 'pasta'],
    ['pedal', 'pedal'],
    ['piano', 'piano'],
    ['pie', 'pie'],
    ['pizza', 'pizza'],
    ['plan', 'plano;magplano;nagplano'],
    ['player', 'manlalaro'],
    ['playground', 'palaruan;playground'],
    ['plum', 'plum'],
    ['popcorn', 'popcorn'],
    ['pork', 'pork'],
    ['pretty', 'maganda'],
    ['puzzle', 'palaisipan;puzzle'],
    ['reach', 'abot;umabot;abutin;naabot'],
    ['rock', 'bato'],
    ['rose', 'rosas'],
    ['ruler', 'ruler;panukat'],
    ['salad', 'salad'],
    ['say', 'sabi;sinabi;sabihin;sasabihin;nagsabi'],
    ['scarf', 'scarf'],
    ['scooter', 'scooter'],
    ['seal', 'seal'],
    ['seed', 'buto'],
    ['seesaw', 'seesaw'],
    ['sharpener', 'tasahan;pantasa;sharpener'],
    ['shorts', 'shorts'],
    ['shower', 'shower'],
    ['simple', 'simple;payak'],
    ['size', 'sukat;size'],
    ['skateboard', 'skateboard'],
    ['skyscraper', 'skyscraper'],
    ['soccer', 'soccer;putbol;futbol'],
    ['soda', 'soda'],
    ['spaghetti', 'spaghetti'],
    ['spinach', 'spinach'],
    ['squash', 'kalabasa;squash'],
    ['squeeze', 'pisil;pisilin;piga;pigain'],
    ['starfish', 'bituing-dagat'],
    ['strawberry', 'strawberry'],
    ['submarine', 'submarine'],
    ['subway', 'subway'],
    ['supermarket', 'supermarket'],
    ['sweater', 'sweater'],
    ['tangerine', 'dalanghita;tangerine'],
    ['tape', 'tape'],
    ['team', 'koponan;team'],
    ['tennis', 'tennis'],
    ['thread', 'sinulid;thread'],
    ['tire', 'gulong'],
    ['tomorrow', 'bukas'],
    ['toothpaste', 'toothpaste'],
    ['tshirt', 'kamiseta;t-shirt'],
    ['van', 'van'],
    ['vase', 'plorera;vase'],
    ['waffle', 'waffle'],
    ['wallet', 'pitaka;wallet'],
    ['week', 'linggo'],
    ['whiteboard', 'whiteboard'],
    ['wife', 'asawa;misis'],
    ['yogurt', 'yogurt'],
]

// Must match normalizeImageWord() in src/hooks/useWordImage.ts.
function normalize(word: string): string {
    return word
        .toLowerCase()
        .replace(/[^\p{L}\p{N}']/gu, '')
        .replace(/'/g, '')
        .trim()
}

async function main() {
    const dryRun = process.argv.includes('--dry-run')
    console.log(`${dryRun ? 'DRY RUN on' : 'Adding Filipino words on'} ${process.env.VITE_SUPABASE_URL}`)

    let added = 0
    const taken: string[] = []
    const noPicture: string[] = []

    for (const [english, filipinoList] of ADDITIONS) {
        const { data: picture, error } = await supabase
            .from('word_images')
            .select('image_path, source, credit, source_url')
            .eq('language', 'en')
            .eq('word', normalize(english))
            .eq('sense', '')
            .maybeSingle()
        if (error) throw error
        if (!picture) {
            noPicture.push(english)
            continue
        }

        for (const raw of filipinoList.split(';')) {
            const word = normalize(raw)
            if (!word) continue
            const { data: existing, error: existingError } = await supabase
                .from('word_images')
                .select('image_path')
                .eq('language', 'fil')
                .eq('word', word)
                .eq('sense', '')
                .maybeSingle()
            if (existingError) throw existingError
            if (existing) {
                if (existing.image_path !== picture.image_path) taken.push(`${raw} (already on ${existing.image_path})`)
                continue
            }
            if (!dryRun) {
                const { error: insertError } = await supabase.from('word_images').insert({
                    language: 'fil',
                    word,
                    image_path: picture.image_path,
                    source: picture.source,
                    credit: picture.credit,
                    source_url: picture.source_url,
                    reviewed: false,
                })
                if (insertError) throw insertError
            }
            added++
            console.log(`  ${english} -> ${word}`)
        }
    }

    console.log(`\n${dryRun ? 'Would add' : 'Added'} ${added} Filipino word(s).`)
    if (taken.length) console.log(`Left alone (the word already has another picture): ${taken.join(', ')}`)
    if (noPicture.length) console.log(`No picture found for English word: ${noPicture.join(', ')}`)
}

main().catch((err) => {
    console.error(err instanceof Error ? err.message : err)
    process.exit(1)
})
