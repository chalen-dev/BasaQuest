// File: src/pages/admin/word_images/WordImagesPage.tsx
// Admin screen for the word pictures shown in the Reading Coach notebook:
// browse everything the import script (scripts/word-images) loaded, replace
// a wrong picture with your own upload, delete one, or add a picture for a
// new word. A card is one picture file and every word that shares it
// (e.g. mango + mangga), so replacing fixes all of its words at once.
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ImagePlus, Loader2, Replace, Trash2, Plus, X } from 'lucide-react'
import { useTheme } from '../../../contexts/ThemeContext'
import { showConfirmation, showToast } from '../../../helpers/swalHelpers'
import { SearchInput } from '../../../components/input/SearchInput'
import { Pagination } from '../../../components/ui/Pagination'
import { AdminSubNav } from '../_components/AdminSubNav'
import {
    useAddPictureMutation,
    useDeletePictureMutation,
    useReplacePictureMutation,
    useWordImageGroupsQuery,
    type PictureGroup,
} from '../_hooks/useWordImages.ts'

const PAGE_SIZE = 20

type LanguageFilter = 'all' | 'en' | 'fil'
type SourceFilter = 'all' | 'arasaac' | 'openmoji' | 'wikimedia' | 'upload'

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

const inputClass =
    'w-full rounded-xl border-2 border-gray-900/10 bg-white px-3 py-2 text-sm font-semibold text-gray-900 outline-none focus:border-teal-500 dark:border-gray-100/10 dark:bg-gray-900 dark:text-gray-50'

export default function WordImagesPage() {
    const { theme } = useTheme()
    const isDark = theme === 'dark'
    const { data, isLoading, error } = useWordImageGroupsQuery()
    const groups = data ?? []
    const addMutation = useAddPictureMutation()
    const replaceMutation = useReplacePictureMutation()
    const deleteMutation = useDeletePictureMutation()

    const [search, setSearch] = useState('')
    const [language, setLanguage] = useState<LanguageFilter>('all')
    const [source, setSource] = useState<SourceFilter>('all')
    const [page, setPage] = useState(0)
    const [adding, setAdding] = useState(false)
    const [newEnglish, setNewEnglish] = useState('')
    const [newFilipino, setNewFilipino] = useState('')
    const [newFile, setNewFile] = useState<File | null>(null)
    const [newCredit, setNewCredit] = useState('')
    const [formError, setFormError] = useState('')
    const replaceInputRef = useRef<HTMLInputElement>(null)
    const replaceTarget = useRef<PictureGroup | null>(null)
    const [busyPath, setBusyPath] = useState<string | null>(null)

    const q = search.trim().toLowerCase()
    const filtered = groups.filter(
        (g) =>
            (source === 'all' || g.source === source) &&
            (language === 'all' || g.words.some((w) => w.language === language)) &&
            (!q || g.words.some((w) => w.word.includes(q))),
    )
    const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
    const safePage = Math.min(page, pageCount - 1)
    const visible = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)

    const resetPage = <T,>(setter: (v: T) => void) => (v: T) => {
        setter(v)
        setPage(0)
    }

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
            showToast(err instanceof Error ? err.message : 'Failed to replace the picture.', 'error', isDark)
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
            showToast(err instanceof Error ? err.message : 'Failed to delete the picture.', 'error', isDark)
        } finally {
            setBusyPath(null)
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
            })
            showToast('Picture added.', 'success', isDark, { timer: 1500 })
            setNewEnglish('')
            setNewFilipino('')
            setNewFile(null)
            setNewCredit('')
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
                            Pictures shown in the Reading Coach word notebook. Replace a wrong one with your own, or
                            add a picture for a word that has none.{' '}
                            <Link to="/credits" className="font-bold text-teal-700 hover:underline dark:text-teal-300">
                                View picture credits
                            </Link>
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setAdding((a) => !a)}
                        className="flex w-fit cursor-pointer items-center gap-1.5 rounded-full bg-teal-500 px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_0_0_#0f766e] transition-[transform,box-shadow] duration-150 active:translate-y-1 active:shadow-[0_1px_0_0_#0f766e] dark:bg-teal-600 dark:shadow-[0_4px_0_0_#115e59]"
                    >
                        {adding ? <X size={16} /> : <Plus size={16} />}
                        {adding ? 'Cancel' : 'Add picture'}
                    </button>
                </div>

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

                <div className="mt-5">
                    <SearchInput value={search} onChange={resetPage(setSearch)} label="Search" placeholder="Word…" />
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                        {LANGUAGE_CHIPS.map((c) => (
                            <button
                                key={c.key}
                                type="button"
                                aria-pressed={language === c.key}
                                onClick={() => resetPage(setLanguage)(c.key)}
                                className={chipClass(language === c.key)}
                            >
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
                    <div className="mt-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400">
                        {filtered.length} picture{filtered.length === 1 ? '' : 's'}
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
                        : 'No pictures match this search.'}
                </p>
            ) : (
                <>
                    <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                        {visible.map((g) => {
                            const busy = busyPath === g.imagePath
                            return (
                                <li
                                    key={g.imagePath}
                                    className="flex flex-col gap-3 rounded-2xl border-2 border-gray-900/10 bg-white p-3 shadow-sm dark:border-gray-100/10 dark:bg-gray-900"
                                >
                                    <div className="flex h-36 items-center justify-center overflow-hidden rounded-xl bg-gray-900/5 dark:bg-gray-100/5">
                                        <img
                                            src={g.url}
                                            alt={g.words.map((w) => w.word).join(', ')}
                                            loading="lazy"
                                            className="h-full w-full object-contain p-2"
                                        />
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {g.words.map((w) => (
                                            <span
                                                key={w.id}
                                                className={`rounded-full px-2.5 py-0.5 text-sm font-bold ${
                                                    w.language === 'en'
                                                        ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300'
                                                        : 'bg-teal-500/15 text-teal-700 dark:text-teal-300'
                                                }`}
                                                title={w.language === 'en' ? 'English' : 'Filipino'}
                                            >
                                                {w.word}
                                            </span>
                                        ))}
                                    </div>
                                    <span
                                        className="text-xs font-semibold text-gray-500 dark:text-gray-400"
                                        title={g.credit ?? undefined}
                                    >
                                        {SOURCE_LABEL[g.source]}
                                    </span>
                                    <div className="mt-auto flex gap-2">
                                        <button
                                            type="button"
                                            disabled={busy}
                                            onClick={() => startReplace(g)}
                                            className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full border-2 border-teal-500/40 px-3 py-1.5 text-sm font-bold text-teal-700 hover:bg-teal-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:text-teal-300"
                                        >
                                            {busy ? <Loader2 size={15} className="animate-spin" /> : <Replace size={15} />}
                                            Replace
                                        </button>
                                        <button
                                            type="button"
                                            disabled={busy}
                                            onClick={() => handleDelete(g)}
                                            aria-label="Delete picture"
                                            className="flex cursor-pointer items-center justify-center rounded-full border-2 border-rose-500/40 px-3 py-1.5 text-rose-600 hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-50 dark:text-rose-400"
                                        >
                                            <Trash2 size={15} />
                                        </button>
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
