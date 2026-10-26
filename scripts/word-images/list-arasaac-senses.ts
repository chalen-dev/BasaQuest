// File: scripts/word-images/list-arasaac-senses.ts
// Shows the pictograms ARASAAC has for each word you give it, with their
// keywords, so you can see the different meanings of a word (top: spinning top,
// bottle top, peak) and pick the id for each one in a senses CSV
// (the arasaac_id column of import-word-images.ts).
//
//   npx tsx scripts/word-images/list-arasaac-senses.ts top bat light
//
// Read-only: nothing is written anywhere.
type Hit = { _id: number; violence?: boolean; keywords?: { keyword: string }[] }

async function main() {
    const words = process.argv.slice(2)
    if (words.length === 0) throw new Error('Usage: list-arasaac-senses.ts <word> [<word> ...]')
    for (const word of words) {
        const res = await fetch(`https://api.arasaac.org/v1/pictograms/en/search/${encodeURIComponent(word)}`)
        if (!res.ok) {
            console.log(`${word}: search failed (${res.status})`)
            continue
        }
        const hits = ((await res.json()) as Hit[]).filter((h) => !h.violence)
        const lines = hits.slice(0, 7).map((h) => {
            const kw = (h.keywords ?? []).map((k) => k.keyword).slice(0, 4).join(' / ')
            return `${h._id}=${kw}`
        })
        console.log(`${word}: ${lines.join(' ; ')}`)
        await new Promise((r) => setTimeout(r, 150))
    }
}

main().catch((err) => {
    console.error(err instanceof Error ? err.message : err)
    process.exit(1)
})
