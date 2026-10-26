// File: src/pages/admin/word_images/WordImagesPage.tsx
// Admin screen for the word pictures shown in the Reading Coach notebook:
// review what the import scripts loaded (approve or send back), fix a
// picture's words, replace it with your own upload, delete it, preview it
// exactly as a pupil sees it, or add a picture for a new word. A card is one
// picture file and every word that shares it (e.g. mango + mangga), so a
// replace or approve applies to all of its words at once.
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Eye, FlaskConical, ImagePlus, Loader2, Pencil, Plus, Replace, Trash2, Undo2, X } from 'lucide-react'
import { useTheme } from '../../../contexts/ThemeContext'
import { showConfirmation, showToast } from '../../../helpers/swalHelpers'
import { SearchInput } from '../../../components/input/SearchInput'
import { Pagination } from '../../../components/ui/Pagination'
import { AdminSubNav } from '../_components/AdminSubNav'
import { CueTester } from './CueTester'
import {
    useAddPictureMutation,
    useAddWordToPictureMutation,
    useDeletePictureMutation,
    useRemoveWordMutation,
    useReplacePictureMutation,
    useSetReviewedMutation,
    useUpdateSenseMutation,
    useWordImageGroupsQuery,
    type PictureGroup,
} from '../_hooks/useWordImages.ts'

const PAGE_SIZE = 20

type LanguageFilter = 'all' | 'en' | 'fil'
type SourceFilter = 'all' | 'arasaac' | 'openmoji' | 'wikimedia' | 'upload'
type StatusFilter = 'review' | 'reviewed' | 'all'

const LANGUAGE_CHIPS: { key: LanguageFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'en', label: 'English' },
    { key: 'fil', label: 'Filipino' },
]

const SOURCE_LABEL: Record<Exclude<SourceFilter, 'all'>, string> = {
    arasaac: 'ARASAAC',
    openmoji: 'OpenMoji',
    wikimedia: 'Wikimedia',
    upload: 'Uploaded',
}

const chipClass = (active: boolean) =>
    `cursor-pointer rounded-full px-4 py-1.5 text-sm font-bold transition-colors duration-150 ${
        active
            ? 'bg-teal-500 text-white dark:bg-teal-600'
            : 'border border-gray-900/10 text-gray-600 hover:bg-gray-900/5 dark:border-gray-100/10 dark:text-gray-300 dark:hover:bg-gray-100/10'
    }`

// One colour per language, used on the word tags and on the language filter
// chips so a tag can be matched to its chip at a glance. Full class names are
// spelled out so Tailwind can see them.
const LANGUAGE_STYLE = {
    en: {
        tag: 'bg-blue-500/15 text-blue-700 dark:bg-blue-400/20 dark:text-blue-300',
        dot: 'bg-blue-500 dark:bg-blue-400',
        chipOn: 'bg-blue-600 text-white dark:bg-blue-500',
        chipOff:
            'border border-blue-500/40 text-blue-700 hover:bg-blue-500/10 dark:border-blue-400/40 dark:text-blue-300',
    },
    fil: {
        tag: 'bg-amber-500/20 text-amber-800 dark:bg-amber-400/20 dark:text-amber-300',
        dot: 'bg-amber-500 dark:bg-amber-400',
        chipOn: 'bg-amber-400 text-gray-900 dark:bg-amber-400',
        chipOff:
            'border border-amber-500/50 text-amber-800 hover:bg-amber-500/10 dark:border-amber-400/40 dark:text-amber-300',
    },
} as const

const languageChipClass = (language: 'en' | 'fil', active: boolean) =>
    `flex cursor-pointer items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold transition-colors duration-150 ${
        active ? LANGUAGE_STYLE[language].chipOn : LANGUAGE_STYLE[language].chipOff
    }`

const inputClass =
    'w-full rounded-xl border-2 border-gray-900/10 bg-white px-3 py-2 text-sm font-semibold text-gray-900 outline-none focus:border-teal-500 dark:border-gray-100/10 dark:bg-gray-900 dark:text-gray-50'

const iconButtonClass =
    'flex cursor-pointer items-center justify-center rounded-full border-2 px-3 py-1.5 disabled:cursor-not-allowed disabled:opacity-50'

// Where the "Preview in coach" button sends you: the first word on the card,
// with its language so the preview looks the picture up the same way the
// coach does.
function previewUrl(g: PictureGroup): string {
    const w = g.words.find((x) => x.language === 'en') ?? g.words[0]
    return `/admin/word-images/preview?word=${encodeURIComponent(w.word)}&lang=${w.language}&from=word-images`
}

// For a word that means more than one thing (top = spinning toy / bottle cap /
// peak): which meaning THIS picture shows, the words in a story that point to
// it, and whether to show it when none of them appear. Words with a single
// picture can leave all of this empty.
function SenseEditor({ group, isDark }: { group: PictureGroup; isDark: boolean }) {
    const mutation = useUpdateSenseMutation()
    const [sense, setSense] = useState(group.sense)
    const [cues, setCues] = useState(group.cues.join(', '))
    const [isDefault, setIsDefault] = useState(group.isDefault)

    const save = async () => {
        try {
            await mutation.mutateAsync({ group, sense, cues, isDefault })
            showToast('Meaning saved.', 'success', isDark, { timer: 1200 })
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Failed to save the meaning.', 'error', isDark)
        }
    }

    return (
        <div className="flex flex-col gap-1.5 rounded-xl bg-violet-500/10 p-2">
            <p className="text-xs font-bold text-violet-700 dark:text-violet-300">
                Meaning (only for a word with more than one picture)
            </p>
            <input
                value={sense}
                onChange={(e) => setSense(e.target.value)}
                placeholder="e.g. spinning toy"
                aria-label="Meaning of this picture"
                className={`${inputClass} !py-1`}
            />
            <input
                value={cues}
                onChange={(e) => setCues(e.target.value)}
                placeholder="Cue words: spin, spinning, toy"
                aria-label="Cue words that point to this meaning"
                className={`${inputClass} !py-1`}
            />
            <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-200">
                <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
                Show this one when no cue word matches
            </label>
            <button
                type="button"
                onClick={save}
                disabled={mutation.isPending}
                className="flex cursor-pointer items-center justify-center gap-1.5 rounded-full bg-violet-600 px-3 py-1 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
                {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
                Save meaning
            </button>
        </div>
    )
}

export default function WordImagesPage() {
    const { theme } = useTheme()
    const isDark = theme === 'dark'
    const { data, isLoading, error } = useWordImageGroupsQuery()
    const groups = data ?? []
    const addMutation = useAddPictureMutation()
    const replaceMutation = useReplacePictureMutation()
    const deleteMutation = useDeletePictureMutation()
    const reviewedMutation = useSetReviewedMutation()
    const addWordMutation = useAddWordToPictureMutation()
    const removeWordMutation = useRemoveWordMutation()

    const [search, setSearch] = useState('')
    const [language, setLanguage] = useState<LanguageFilter>('all')
    const [source, setSource] = useState<SourceFilter>('all')
    const [status, setStatus] = useState<StatusFilter>('review')
    const [page, setPage] = useState(0)
    const [adding, setAdding] = useState(false)
    const [testing, setTesting] = useState(false)
    const [newEnglish, setNewEnglish] = useState('')
    const [newFilipino, setNewFilipino] = useState('')
    const [newFile, setNewFile] = useState<File | null>(null)
    const [newCredit, setNewCredit] = useState('')
    const [newSense, setNewSense] = useState('')
    const [newCues, setNewCues] = useState('')
    const [formError, setFormError] = useState('')
    const [editingPath, setEditingPath] = useState<string | null>(null)
    const [extraWord, setExtraWord] = useState('')
    const [extraLang, setExtraLang] = useState<'en' | 'fil'>('en')
    const replaceInputRef = useRef<HTMLInputElement>(null)
    const replaceTarget = useRef<PictureGroup | null>(null)
    const [busyPath, setBusyPath] = useState<string | null>(null)

    const q = search.trim().toLowerCase()
    const filtered = groups.filter(
        (g) =>
            (status === 'all' || (status === 'review' ? !g.reviewed : g.reviewed)) &&
            (source === 'all' || g.source === source) &&
            (language === 'all' || g.words.some((w) => w.language === language)) &&
            (!q || g.words.some((w) => w.word.includes(q))),
    )
    const reviewedCount = groups.filter((g) => g.reviewed).length
    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    const safePage = Math.min(page, pageCount - 1)
    const visible = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)
    const visibleUnreviewed = visible.filter((g) => !g.reviewed)

    const resetPage = <T,>(setter: (v: T) => void) => (v: T) => {
        setter(v)
        setPage(0)
    }

    const fail = (err: unknown, fallback: string) =>
        showToast(err instanceof Error ? err.message : fallback, 'error', isDark)

    const startReplace = (group: PictureGroup) => {
        replaceTarget.current = group
        replaceInputRef.current?.click()
    }

    const handleReplaceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        const group = replaceTarget.current
        e.target.value = ''
        if (!file || !group) return
        setBusyPath(group.imagePath)
        try {
            await replaceMutation.mutateAsync({ group, file, credit: '' })
            showToast('Picture replaced.', 'success', isDark, { timer: 1500 })
        } catch (err) {
            fail(err, 'Failed to replace the picture.')
        } finally {
            setBusyPath(null)
        }
    }

    const handleDelete = async (group: PictureGroup) => {
        const names = group.words.map((w) => w.word).join(', ')
        const confirmed = await showConfirmation(
            'Delete this picture?',
            `"${names}" will go back to the placeholder in the word notebook.`,
            isDark,
            'warning',
            'Yes, delete',
        )
        if (!confirmed) return
        setBusyPath(group.imagePath)
        try {
            await deleteMutation.mutateAsync(group)
            showToast('Picture deleted.', 'success', isDark, { timer: 1200 })
        } catch (err) {
            fail(err, 'Failed to delete the picture.')
        } finally {
            setBusyPath(null)
        }
    }

    const setReviewed = async (paths: string[], reviewed: boolean) => {
        try {
            await reviewedMutation.mutateAsync({ imagePaths: paths, reviewed })
        } catch (err) {
            fail(err, 'Failed to update the review status.')
        }
    }

    const handleAddWord = async (group: PictureGroup) => {
        if (!extraWord.trim()) return
        try {
            await addWordMutation.mutateAsync({ group, language: extraLang, word: extraWord })
            setExtraWord('')
            showToast('Word added to this picture.', 'success', isDark, { timer: 1200 })
        } catch (err) {
            fail(err, 'Failed to add the word.')
        }
    }

    const handleRemoveWord = async (group: PictureGroup, wordId: string) => {
        try {
            await removeWordMutation.mutateAsync({ group, wordId })
        } catch (err) {
            fail(err, 'Failed to remove the word.')
        }
    }

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newEnglish.trim() && !newFilipino.trim()) {
            setFormError('Enter an English or Filipino word.')
            return
        }
        if (!newFile) {
            setFormError('Choose a picture.')
            return
        }
        setFormError('')
        try {
            await addMutation.mutateAsync({
                english: newEnglish,
                filipino: newFilipino,
                file: newFile,
                credit: newCredit,
                sense: newSense,
                cues: newCues,
            })
            showToast('Picture added.', 'success', isDark, { timer: 1500 })
            setNewEnglish('')
            setNewFilipino('')
            setNewFile(null)
            setNewCredit('')
            setNewSense('')
            setNewCues('')
            setAdding(false)
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
        }
    }

    return (
        <div className="mx-auto max-w-6xl px-4 pb-12 pt-2">
            <AdminSubNav />
            <input
                ref={replaceInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleReplaceFile}
            />

            <section className="mb-6 rounded-3xl border-2 border-gray-900/10 bg-gray-50 p-5 shadow-sm dark:border-gray-100/10 dark:bg-gray-950 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-extrabold text-gray-900 dark:text-gray-50">Word pictures</h1>
                        <p className="mt-1 text-sm font-medium text-gray-600 dark:text-gray-300">
                            Review the pictures shown in the Reading Coach word notebook: approve the good ones, fix
                            the words on a picture, replace a wrong one, or preview it as a pupil sees it.{' '}
                            <Link to="/credits" className="font-bold text-teal-700 hover:underline dark:text-teal-300">
                                View picture credits
                            </Link>
                        </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                        <button
                            type="button"
                            aria-pressed={testing}
                            onClick={() => setTesting((t) => !t)}
                            className="flex w-fit cursor-pointer items-center gap-1.5 rounded-full border-2 border-violet-500/40 px-5 py-2.5 text-sm font-bold text-violet-700 hover:bg-violet-500/10 dark:text-violet-300"
                        >
                            <FlaskConical size={16} />
                            {testing ? 'Close tester' : 'Test cue words'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setAdding((a) => !a)}
                            className="flex w-fit cursor-pointer items-center gap-1.5 rounded-full bg-teal-500 px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_0_0_#0f766e] transition-[transform,box-shadow] duration-150 active:translate-y-1 active:shadow-[0_1px_0_0_#0f766e] dark:bg-teal-600 dark:shadow-[0_4px_0_0_#115e59]"
                        >
                            {adding ? <X size={16} /> : <Plus size={16} />}
                            {adding ? 'Cancel' : 'Add picture'}
                        </button>
                    </div>
                </div>

                {!isLoading && !error && groups.length > 0 && (
                    <div className="mt-4">
                        <div className="flex items-center justify-between text-sm font-bold text-gray-700 dark:text-gray-200">
                            <span>
                                {reviewedCount} of {groups.length} reviewed
                            </span>
                            <span className="text-gray-500 dark:text-gray-400">
                                {groups.length - reviewedCount} left
                            </span>
                        </div>
                        <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-gray-900/10 dark:bg-gray-100/10">
                            <div
                                className="h-full rounded-full bg-teal-500 transition-[width] duration-300"
                                style={{ width: `${(reviewedCount / groups.length) * 100}%` }}
                            />
                        </div>
                    </div>
                )}

                {adding && (
                    <form
                        onSubmit={handleAdd}
                        className="mt-5 grid gap-3 rounded-2xl border-2 border-dashed border-gray-900/10 bg-white p-4 dark:border-gray-100/10 dark:bg-gray-900 sm:grid-cols-2"
                    >
                        <label className="text-sm font-bold text-gray-700 dark:text-gray-200">
                            English word
                            <input
                                value={newEnglish}
                                onChange={(e) => setNewEnglish(e.target.value)}
                                placeholder="e.g. mango"
                                className={`${inputClass} mt-1`}
                            />
                        </label>
                        <label className="text-sm font-bold text-gray-700 dark:text-gray-200">
                            Filipino word (optional)
                            <input
                                value={newFilipino}
                                onChange={(e) => setNewFilipino(e.target.value)}
                                placeholder="e.g. mangga"
                                className={`${inputClass} mt-1`}
                            />
                        </label>
                        <label className="text-sm font-bold text-gray-700 dark:text-gray-200">
                            Picture
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => setNewFile(e.target.files?.[0] ?? null)}
                                className={`${inputClass} mt-1 file:mr-3 file:cursor-pointer file:rounded-full file:border-0 file:bg-teal-500/15 file:px-3 file:py-1 file:text-sm file:font-bold file:text-teal-700 dark:file:text-teal-300`}
                            />
                        </label>
                        <label className="text-sm font-bold text-gray-700 dark:text-gray-200">
                            Credit (author and license, if it isn't yours)
                            <input
                                value={newCredit}
                                onChange={(e) => setNewCredit(e.target.value)}
                                placeholder="e.g. Photo by Jane Doe, CC BY 4.0"
                                className={`${inputClass} mt-1`}
                            />
                        </label>
                        <label className="text-sm font-bold text-gray-700 dark:text-gray-200">
                            Meaning (only if this word has more than one picture)
                            <input
                                value={newSense}
                                onChange={(e) => setNewSense(e.target.value)}
                                placeholder="e.g. spinning toy"
                                className={`${inputClass} mt-1`}
                            />
                        </label>
                        <label className="text-sm font-bold text-gray-700 dark:text-gray-200">
                            Cue words for that meaning
                            <input
                                value={newCues}
                                onChange={(e) => setNewCues(e.target.value)}
                                placeholder="e.g. spin, spinning, toy"
                                className={`${inputClass} mt-1`}
                            />
                        </label>
                        <div className="flex items-center gap-3 sm:col-span-2">
                            <button
                                type="submit"
                                disabled={addMutation.isPending}
                                className="flex cursor-pointer items-center gap-1.5 rounded-full bg-teal-500 px-5 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-teal-600"
                            >
                                {addMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
                                Save picture
                            </button>
                            {formError && (
                                <span className="text-sm font-semibold text-rose-600 dark:text-rose-400">{formError}</span>
                            )}
                        </div>
                    </form>
                )}

                {testing && <CueTester groups={groups} />}

                <div className="mt-5">
                    <SearchInput value={search} onChange={resetPage(setSearch)} label="Search" placeholder="Word…" />
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                        {(
                            [
                                ['review', 'Needs review'],
                                ['reviewed', 'Reviewed'],
                                ['all', 'Everything'],
                            ] as [StatusFilter, string][]
                        ).map(([key, label]) => (
                            <button
                                key={key}
                                type="button"
                                aria-pressed={status === key}
                                onClick={() => resetPage(setStatus)(key)}
                                className={chipClass(status === key)}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {LANGUAGE_CHIPS.map((c) => (
                            <button
                                key={c.key}
                                type="button"
                                aria-pressed={language === c.key}
                                onClick={() => resetPage(setLanguage)(c.key)}
                                className={
                                    c.key === 'all'
                                        ? chipClass(language === c.key)
                                        : languageChipClass(c.key, language === c.key)
                                }
                            >
                                {c.key !== 'all' && (
                                    <span
                                        aria-hidden="true"
                                        className={`h-2.5 w-2.5 rounded-full ${
                                            language === c.key ? 'bg-current' : LANGUAGE_STYLE[c.key].dot
                                        }`}
                                    />
                                )}
                                {c.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {(['all', 'arasaac', 'openmoji', 'wikimedia', 'upload'] as SourceFilter[]).map((s) => (
                            <button
                                key={s}
                                type="button"
                                aria-pressed={source === s}
                                onClick={() => resetPage(setSource)(s)}
                                className={chipClass(source === s)}
                            >
                                {s === 'all' ? 'Any source' : SOURCE_LABEL[s]}
                            </button>
                        ))}
                    </div>
                </div>
                {!isLoading && !error && (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                        <button
                            type="button"
                            disabled={visibleUnreviewed.length === 0 || reviewedMutation.isPending}
                            onClick={() =>
                                setReviewed(
                                    visibleUnreviewed.map((g) => g.imagePath),
                                    true,
                                )
                            }
                            className="flex cursor-pointer items-center gap-1.5 rounded-full border-2 border-teal-500/40 px-4 py-1.5 text-sm font-bold text-teal-700 hover:bg-teal-500/10 disabled:cursor-not-allowed disabled:opacity-40 dark:text-teal-300"
                        >
                            <Check size={15} /> Approve all {visibleUnreviewed.length} on this page
                        </button>
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                            {filtered.length} picture{filtered.length === 1 ? '' : 's'}
                        </span>
                    </div>
                )}
            </section>

            {error ? (
                <p className="rounded-2xl border-2 border-dashed border-rose-500/30 p-7 text-center text-base font-semibold text-rose-600 dark:text-rose-400">
                    Couldn't load the word pictures. {error instanceof Error ? error.message : ''}
                </p>
            ) : isLoading ? (
                <div className="flex items-center justify-center p-12 text-gray-500">
                    <Loader2 className="animate-spin" />
                </div>
            ) : filtered.length === 0 ? (
                <p className="rounded-2xl border-2 border-dashed border-gray-900/10 p-7 text-center text-base font-semibold text-gray-500 dark:border-gray-100/10 dark:text-gray-400">
                    {groups.length === 0
                        ? 'No word pictures yet. Run the import script or add one above.'
                        : status === 'review' && !q && language === 'all' && source === 'all'
                          ? 'Everything has been reviewed. 🎉'
                          : 'No pictures match this search.'}
                </p>
            ) : (
                <>
                    <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                        {visible.map((g) => {
                            const busy = busyPath === g.imagePath
                            const editing = editingPath === g.imagePath
                            return (
                                <li
                                    key={g.imagePath}
                                    className={`flex flex-col gap-3 rounded-2xl border-2 bg-white p-3 shadow-sm dark:bg-gray-900 ${
                                        g.reviewed
                                            ? 'border-teal-500/40'
                                            : 'border-gray-900/10 dark:border-gray-100/10'
                                    }`}
                                >
                                    <Link
                                        to={previewUrl(g)}
                                        title="Preview in the Reading Coach"
                                        className="relative flex h-36 items-center justify-center overflow-hidden rounded-xl bg-gray-900/5 dark:bg-gray-100/5"
                                    >
                                        <img
                                            src={g.url}
                                            alt={g.words.map((w) => w.word).join(', ')}
                                            loading="lazy"
                                            className="h-full w-full object-contain p-2"
                                        />
                                        {g.reviewed && (
                                            <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-teal-500 text-white">
                                                <Check size={14} />
                                            </span>
                                        )}
                                    </Link>
                                    <div className="flex flex-wrap gap-1.5">
                                        {g.words.map((w) => (
                                            <span
                                                key={w.id}
                                                className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-bold ${LANGUAGE_STYLE[w.language].tag}`}
                                                title={w.language === 'en' ? 'English' : 'Filipino'}
                                            >
                                                {w.word}
                                                {editing && (
                                                    <button
                                                        type="button"
                                                        aria-label={`Remove ${w.word}`}
                                                        onClick={() => handleRemoveWord(g, w.id)}
                                                        className="cursor-pointer rounded-full hover:bg-rose-500/20"
                                                    >
                                                        <X size={13} />
                                                    </button>
                                                )}
                                            </span>
                                        ))}
                                    </div>
                                    {(g.sense || g.cues.length > 0 || g.isDefault) && (
                                        <p className="rounded-lg bg-violet-500/10 px-2 py-1 text-xs font-semibold text-violet-700 dark:text-violet-300">
                                            {g.sense ? <b>{g.sense}</b> : <b>meaning not named</b>}
                                            {g.isDefault && ' · default'}
                                            {g.cues.length > 0 && ` · cues: ${g.cues.join(', ')}`}
                                        </p>
                                    )}
                                    {editing && <SenseEditor key={g.imagePath} group={g} isDark={isDark} />}
                                    {editing && (
                                        <div className="flex gap-1.5">
                                            <input
                                                value={extraWord}
                                                onChange={(e) => setExtraWord(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault()
                                                        void handleAddWord(g)
                                                    }
                                                }}
                                                placeholder="Add a word"
                                                className={`${inputClass} min-w-0 flex-1 !py-1`}
                                            />
                                            <select
                                                value={extraLang}
                                                onChange={(e) => setExtraLang(e.target.value as 'en' | 'fil')}
                                                aria-label="Language of the new word"
                                                className={`${inputClass} !w-auto !px-2 !py-1`}
                                            >
                                                <option value="en">EN</option>
                                                <option value="fil">FIL</option>
                                            </select>
                                            <button
                                                type="button"
                                                onClick={() => handleAddWord(g)}
                                                aria-label="Add word"
                                                className={`${iconButtonClass} border-teal-500/40 text-teal-700 hover:bg-teal-500/10 dark:text-teal-300`}
                                            >
                                                <Plus size={15} />
                                            </button>
                                        </div>
                                    )}
                                    <span
                                        className="text-xs font-semibold text-gray-500 dark:text-gray-400"
                                        title={g.credit ?? undefined}
                                    >
                                        {SOURCE_LABEL[g.source]}
                                    </span>
                                    <div className="mt-auto flex flex-col gap-2">
                                        <button
                                            type="button"
                                            disabled={busy || reviewedMutation.isPending}
                                            onClick={() => setReviewed([g.imagePath], !g.reviewed)}
                                            className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50 ${
                                                g.reviewed
                                                    ? 'border-2 border-gray-900/15 text-gray-600 hover:bg-gray-900/5 dark:border-gray-100/20 dark:text-gray-300'
                                                    : 'bg-teal-500 text-white hover:bg-teal-600 dark:bg-teal-600'
                                            }`}
                                        >
                                            {g.reviewed ? <Undo2 size={15} /> : <Check size={15} />}
                                            {g.reviewed ? 'Undo review' : 'Approve'}
                                        </button>
                                        <button
                                            type="button"
                                            disabled={busy}
                                            onClick={() => startReplace(g)}
                                            className={`${iconButtonClass} gap-1.5 border-teal-500/40 text-sm font-bold text-teal-700 hover:bg-teal-500/10 dark:text-teal-300`}
                                        >
                                            {busy ? <Loader2 size={15} className="animate-spin" /> : <Replace size={15} />}
                                            Replace
                                        </button>
                                        <div className="grid grid-cols-3 gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEditingPath(editing ? null : g.imagePath)
                                                    setExtraWord('')
                                                }}
                                                aria-label="Edit words"
                                                aria-pressed={editing}
                                                title="Edit the words on this picture"
                                                className={`${iconButtonClass} border-gray-900/15 text-gray-600 hover:bg-gray-900/5 dark:border-gray-100/20 dark:text-gray-300 ${
                                                    editing ? 'bg-gray-900/10 dark:bg-gray-100/10' : ''
                                                }`}
                                            >
                                                <Pencil size={15} />
                                            </button>
                                            <Link
                                                to={previewUrl(g)}
                                                aria-label="Preview in coach"
                                                title="Preview in the Reading Coach"
                                                className={`${iconButtonClass} border-gray-900/15 text-gray-600 hover:bg-gray-900/5 dark:border-gray-100/20 dark:text-gray-300`}
                                            >
                                                <Eye size={15} />
                                            </Link>
                                            <button
                                                type="button"
                                                disabled={busy}
                                                onClick={() => handleDelete(g)}
                                                aria-label="Delete picture"
                                                className={`${iconButtonClass} border-rose-500/40 text-rose-600 hover:bg-rose-500/10 dark:text-rose-400`}
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                    <Pagination page={safePage} pageCount={pageCount} onPageChange={setPage} className="mt-6" />
                </>
            )}
        </div>
    )
}
