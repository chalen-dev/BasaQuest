// File: src/pages/credits/PictureCreditsPage.tsx
// Attribution for the word pictures in the Reading Coach notebook. ARASAAC
// (CC BY-NC-SA) and OpenMoji (CC BY-SA) both require crediting the author,
// so this page names each source and its license, with a count generated
// from the word_images table. Pictures from Wikimedia Commons or uploaded
// by an admin carry their own per-picture credit line, listed below.
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ArrowLeft, ExternalLink, Loader2 } from 'lucide-react'
import { useLang } from '../../contexts/LangContext.tsx'
import { fetchAllWordImageRows } from '../../hooks/useWordImage.ts'

type CreditRow = {
    source: 'arasaac' | 'openmoji' | 'wikimedia' | 'upload'
    credit: string | null
    word: string
    image_path: string
}

const STRINGS = {
    en: {
        back: 'Back',
        title: 'Picture credits',
        intro: 'The pictures in the word notebook come from the open sources below. Thank you to their creators.',
        pictures: (n: number) => `${n} picture${n === 1 ? '' : 's'}`,
        arasaacBody:
            'Pictographic symbols by Sergio Palao, from ARASAAC (arasaac.org), property of the Government of Aragón. Used under the Creative Commons BY-NC-SA 4.0 license for non-commercial educational use.',
        openmojiBody:
            'Emoji by OpenMoji (openmoji.org), the open-source emoji project of HFG Schwäbisch Gmünd. Used under the Creative Commons BY-SA 4.0 license.',
        otherTitle: 'Other pictures',
        otherIntro: 'Photos and drawings added by hand, each with its own credit.',
        noCredit: 'Added by the BasaQuest team',
        words: 'Words',
        license: 'License',
        loadError: "Couldn't load the credits.",
    },
    fil: {
        back: 'Bumalik',
        title: 'Mga kredito ng larawan',
        intro: 'Ang mga larawan sa kuwaderno ng salita ay galing sa mga bukas na pinagkukunan sa ibaba. Salamat sa mga gumawa nito.',
        pictures: (n: number) => `${n} larawan`,
        arasaacBody:
            'Mga pictographic na simbolo ni Sergio Palao, mula sa ARASAAC (arasaac.org), pag-aari ng Pamahalaan ng Aragón. Ginamit sa ilalim ng lisensyang Creative Commons BY-NC-SA 4.0 para sa hindi pangkomersiyong gamit sa edukasyon.',
        openmojiBody:
            'Mga emoji ng OpenMoji (openmoji.org), ang open-source na proyekto ng emoji ng HFG Schwäbisch Gmünd. Ginamit sa ilalim ng lisensyang Creative Commons BY-SA 4.0.',
        otherTitle: 'Iba pang larawan',
        otherIntro: 'Mga litrato at drowing na idinagdag nang mano-mano, bawat isa ay may sariling kredito.',
        noCredit: 'Idinagdag ng koponan ng BasaQuest',
        words: 'Mga salita',
        license: 'Lisensya',
        loadError: 'Hindi mai-load ang mga kredito.',
    },
} as const

function useCreditRowsQuery() {
    return useQuery({
        queryKey: ['word_images', 'credits'] as const,
        queryFn: () => fetchAllWordImageRows<CreditRow>('source, credit, word, image_path'),
    })
}

const cardClass =
    'rounded-3xl border-2 border-gray-900/10 bg-white p-6 shadow-sm dark:border-gray-100/10 dark:bg-gray-900'

export default function PictureCreditsPage() {
    const { lang } = useLang()
    const t = STRINGS[lang]
    const { data, isLoading, error } = useCreditRowsQuery()
    const rows = data ?? []

    // One picture file can back several words, so count distinct files.
    const pictureCount = (source: CreditRow['source']) =>
        new Set(rows.filter((r) => r.source === source).map((r) => r.image_path)).size

    // Hand-added pictures, grouped by their credit line.
    const otherGroups = new Map<string, Set<string>>()
    for (const r of rows) {
        if (r.source !== 'wikimedia' && r.source !== 'upload') continue
        const key = r.credit?.trim() || t.noCredit
        if (!otherGroups.has(key)) otherGroups.set(key, new Set())
        otherGroups.get(key)!.add(r.word)
    }
    const others = [...otherGroups.entries()].sort((a, b) => a[0].localeCompare(b[0]))

    const arasaac = pictureCount('arasaac')
    const openmoji = pictureCount('openmoji')

    return (
        <div className="mx-auto max-w-3xl px-4 pb-12 pt-4">
            <Link
                to="/home"
                className="mb-5 inline-flex items-center gap-1.5 text-sm font-bold text-gray-600 hover:underline dark:text-gray-300"
            >
                <ArrowLeft size={16} /> {t.back}
            </Link>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-50">{t.title}</h1>
            <p className="mb-6 mt-2 text-base font-medium text-gray-600 dark:text-gray-300">{t.intro}</p>

            {error ? (
                <p className="rounded-2xl border-2 border-dashed border-rose-500/30 p-7 text-center text-base font-semibold text-rose-600 dark:text-rose-400">
                    {t.loadError}
                </p>
            ) : isLoading ? (
                <div className="flex items-center justify-center p-12 text-gray-500">
                    <Loader2 className="animate-spin" />
                </div>
            ) : (
                <div className="flex flex-col gap-5">
                    {arasaac > 0 && (
                        <section className={cardClass}>
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                                <h2 className="text-xl font-extrabold text-gray-900 dark:text-gray-50">ARASAAC</h2>
                                <span className="rounded-full bg-teal-500/15 px-3 py-1 text-sm font-bold text-teal-700 dark:text-teal-300">
                                    {t.pictures(arasaac)}
                                </span>
                            </div>
                            <p className="mt-3 text-base leading-relaxed text-gray-700 dark:text-gray-300">{t.arasaacBody}</p>
                            <div className="mt-4 flex flex-wrap gap-4 text-sm font-bold text-teal-700 dark:text-teal-300">
                                <a
                                    href="https://arasaac.org"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 hover:underline"
                                >
                                    arasaac.org <ExternalLink size={14} />
                                </a>
                                <a
                                    href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 hover:underline"
                                >
                                    {t.license}: CC BY-NC-SA 4.0 <ExternalLink size={14} />
                                </a>
                            </div>
                        </section>
                    )}
                    {openmoji > 0 && (
                        <section className={cardClass}>
                            <div className="flex flex-wrap items-baseline justify-between gap-2">
                                <h2 className="text-xl font-extrabold text-gray-900 dark:text-gray-50">OpenMoji</h2>
                                <span className="rounded-full bg-teal-500/15 px-3 py-1 text-sm font-bold text-teal-700 dark:text-teal-300">
                                    {t.pictures(openmoji)}
                                </span>
                            </div>
                            <p className="mt-3 text-base leading-relaxed text-gray-700 dark:text-gray-300">{t.openmojiBody}</p>
                            <div className="mt-4 flex flex-wrap gap-4 text-sm font-bold text-teal-700 dark:text-teal-300">
                                <a
                                    href="https://openmoji.org"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 hover:underline"
                                >
                                    openmoji.org <ExternalLink size={14} />
                                </a>
                                <a
                                    href="https://creativecommons.org/licenses/by-sa/4.0/"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 hover:underline"
                                >
                                    {t.license}: CC BY-SA 4.0 <ExternalLink size={14} />
                                </a>
                            </div>
                        </section>
                    )}
                    {others.length > 0 && (
                        <section className={cardClass}>
                            <h2 className="text-xl font-extrabold text-gray-900 dark:text-gray-50">{t.otherTitle}</h2>
                            <p className="mt-1 text-sm font-medium text-gray-600 dark:text-gray-300">{t.otherIntro}</p>
                            <ul className="mt-4 flex flex-col gap-3">
                                {others.map(([credit, words]) => (
                                    <li
                                        key={credit}
                                        className="rounded-2xl bg-gray-900/5 p-4 dark:bg-gray-100/5"
                                    >
                                        <p className="text-base font-semibold text-gray-800 dark:text-gray-100">{credit}</p>
                                        <p className="mt-1 text-sm font-medium text-gray-600 dark:text-gray-400">
                                            {t.words}: {[...words].sort().join(', ')}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}
                </div>
            )}
        </div>
    )
}
