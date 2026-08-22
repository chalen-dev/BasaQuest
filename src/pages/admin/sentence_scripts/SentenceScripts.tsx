// File: src/pages/admin/recording/sentence_scripts/SentenceScripts.tsx
// Admin CRUD for the reading scripts the recording flow reads sentences
// from (RecordSession.tsx / SelectStudent.tsx) — scripts ("sentence
// sets") and their sentences used to be hardcoded; this page is what
// makes them database-backed and editable instead.
//
// Two-panel layout: scripts on the left (create/rename/delete), the
// selected script's sentences on the right (add/edit/delete/reorder).
// Reordering uses simple up/down arrow buttons rather than drag-and-drop
// — no extra dependency, and plenty for a script that's a dozen or so
// sentences long.
//
// sentence_number (a sentence's stable identity — what student_recordings
// keys off) is never touched here, only display_order (purely visual
// ordering) — see the header comment on useReadingSentences.ts and the
// reading_sentence_sets migration for why those are kept separate.
import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Check, FileText, Loader2, Pencil, Plus, ScrollText, Trash2, X } from 'lucide-react'
import { AdminSubNav } from '../components/AdminSubNav.tsx'
import { Tooltip } from '../../../components/ui/Tooltip.tsx'
import { showConfirmation, showToast } from '../../../helpers/swalHelpers.ts'
import { useTheme } from '../../../contexts/ThemeContext.tsx'
import {
    useReadingSentenceSetsQuery,
    useSentencesForSetQuery,
    useCreateSentenceSetMutation,
    useUpdateSentenceSetLabelMutation,
    useDeleteSentenceSetMutation,
    useCreateSentenceMutation,
    useUpdateSentenceTextMutation,
    useDeleteSentenceMutation,
    useReorderSentencesMutation,
} from '../useReadingSentences.ts'

export default function SentenceScripts() {
    const { theme } = useTheme()
    const { data: setsData, isLoading: loadingSets, error: setsError } = useReadingSentenceSetsQuery()
    const sets = useMemo(() => setsData ?? [], [setsData])
    const [selectedSetKey, setSelectedSetKey] = useState('')
    // Fall back to the first set once the list loads, without needing an
    // effect — nothing here writes state just to mirror derived data.
    const effectiveSetKey = selectedSetKey || sets[0]?.key || ''
    const selectedSet = sets.find((s) => s.key === effectiveSetKey) ?? null

    const { data: sentencesData, isLoading: loadingSentences, error: sentencesError } = useSentencesForSetQuery(
        effectiveSetKey || null,
    )
    const sentences = useMemo(() => sentencesData ?? [], [sentencesData])

    const createSetMutation = useCreateSentenceSetMutation()
    const renameSetMutation = useUpdateSentenceSetLabelMutation()
    const deleteSetMutation = useDeleteSentenceSetMutation()
    const createSentenceMutation = useCreateSentenceMutation(effectiveSetKey || null)
    const updateSentenceMutation = useUpdateSentenceTextMutation(effectiveSetKey || null)
    const deleteSentenceMutation = useDeleteSentenceMutation(effectiveSetKey || null)
    const reorderMutation = useReorderSentencesMutation(effectiveSetKey || null)

    const [creatingSet, setCreatingSet] = useState(false)
    const [newSetLabel, setNewSetLabel] = useState('')
    const [editingSetKey, setEditingSetKey] = useState<string | null>(null)
    const [editingSetLabel, setEditingSetLabel] = useState('')
    const [editingSentenceId, setEditingSentenceId] = useState<string | null>(null)
    const [editingSentenceText, setEditingSentenceText] = useState('')
    const [newSentenceText, setNewSentenceText] = useState('')

    const handleCreateSet = async () => {
        const label = newSetLabel.trim()
        if (!label) return
        try {
            const created = await createSetMutation.mutateAsync(label)
            setNewSetLabel('')
            setCreatingSet(false)
            setSelectedSetKey(created.key)
            showToast('Script created.', 'success', theme === 'dark', { timer: 1200 })
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Failed to create script.', 'error', theme === 'dark')
        }
    }

    const startRenameSet = (key: string, label: string) => {
        setEditingSetKey(key)
        setEditingSetLabel(label)
    }
    const handleRenameSet = async () => {
        if (!editingSetKey) return
        const label = editingSetLabel.trim()
        if (!label) return
        try {
            await renameSetMutation.mutateAsync({ key: editingSetKey, label })
            setEditingSetKey(null)
            showToast('Renamed.', 'success', theme === 'dark', { timer: 1000 })
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Failed to rename script.', 'error', theme === 'dark')
        }
    }

    const handleDeleteSet = async (key: string, label: string) => {
        const confirmed = await showConfirmation(
            `Delete "${label}"?`,
            'Every sentence in this script will be permanently deleted too. Recordings already made against this script keep their own copy of the sentence text, so they are not affected — but the script itself will be gone.',
            theme === 'dark',
            'warning',
            'Yes, delete',
        )
        if (!confirmed) return
        try {
            await deleteSetMutation.mutateAsync(key)
            if (effectiveSetKey === key) setSelectedSetKey('')
            showToast('Script deleted.', 'success', theme === 'dark', { timer: 1200 })
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Failed to delete script.', 'error', theme === 'dark')
        }
    }

    const handleAddSentence = async () => {
        const text = newSentenceText.trim()
        if (!text) return
        try {
            await createSentenceMutation.mutateAsync(text)
            setNewSentenceText('')
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Failed to add sentence.', 'error', theme === 'dark')
        }
    }

    const startEditSentence = (id: string, text: string) => {
        setEditingSentenceId(id)
        setEditingSentenceText(text)
    }
    const handleSaveSentence = async () => {
        if (!editingSentenceId) return
        const text = editingSentenceText.trim()
        if (!text) return
        try {
            await updateSentenceMutation.mutateAsync({ id: editingSentenceId, text })
            setEditingSentenceId(null)
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Failed to save sentence.', 'error', theme === 'dark')
        }
    }

    const handleDeleteSentence = async (id: string, text: string) => {
        const confirmed = await showConfirmation(
            'Delete this sentence?',
            `"${text}" will be permanently removed from the script.`,
            theme === 'dark',
            'warning',
            'Yes, delete',
        )
        if (!confirmed) return
        try {
            await deleteSentenceMutation.mutateAsync(id)
            showToast('Deleted.', 'success', theme === 'dark', { timer: 1000 })
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Failed to delete sentence.', 'error', theme === 'dark')
        }
    }

    const moveSentence = (index: number, direction: -1 | 1) => {
        const targetIndex = index + direction
        if (targetIndex < 0 || targetIndex >= sentences.length) return
        const reordered = [...sentences]
        const tmp = reordered[index]
        reordered[index] = reordered[targetIndex]
        reordered[targetIndex] = tmp
        reorderMutation.mutate(reordered.map((s) => s.id))
    }

    return (
        <div className="mx-auto max-w-6xl px-4 pb-12 pt-2">
            <AdminSubNav />
            <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
                {/* Scripts list */}
                <section className="h-fit rounded-3xl border border-gray-900/5 bg-white p-5 shadow-sm dark:border-gray-100/10 dark:bg-gray-900">
                    <div className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-teal-700 dark:text-teal-300">
                        <ScrollText size={14} /> Scripts
                    </div>
                    {loadingSets ? (
                        <div className="flex items-center justify-center py-10 text-sm text-gray-500 dark:text-gray-400">
                            <Loader2 size={16} className="mr-2 animate-spin" /> Loading…
                        </div>
                    ) : setsError ? (
                        <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                            Couldn't load scripts: {setsError instanceof Error ? setsError.message : 'Something went wrong.'}
                        </p>
                    ) : (
                        <div className="flex flex-col gap-1.5">
                            {sets.map((s) => {
                                const isSelected = s.key === effectiveSetKey
                                const isEditing = editingSetKey === s.key
                                return (
                                    <div
                                        key={s.key}
                                        className={`flex items-center gap-1.5 rounded-xl border-2 p-2 transition-colors duration-150 ${
                                            isSelected
                                                ? 'border-teal-400 bg-teal-500/5'
                                                : 'border-transparent hover:bg-gray-900/5 dark:hover:bg-gray-100/10'
                                        }`}
                                    >
                                        {isEditing ? (
                                            <>
                                                <input
                                                    autoFocus
                                                    value={editingSetLabel}
                                                    onChange={(e) => setEditingSetLabel(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleRenameSet()
                                                        if (e.key === 'Escape') setEditingSetKey(null)
                                                    }}
                                                    className="min-w-0 flex-1 rounded-lg border-2 border-teal-400 bg-transparent px-2 py-1 text-sm font-semibold text-gray-900 outline-none dark:text-gray-50"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleRenameSet}
                                                    disabled={renameSetMutation.isPending}
                                                    aria-label="Save name"
                                                    className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-teal-600 hover:bg-teal-500/15 disabled:opacity-50 dark:text-teal-400"
                                                >
                                                    <Check size={15} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setEditingSetKey(null)}
                                                    aria-label="Cancel"
                                                    className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-gray-500 hover:bg-gray-900/5 dark:text-gray-400 dark:hover:bg-gray-100/10"
                                                >
                                                    <X size={15} />
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedSetKey(s.key)}
                                                    className="min-w-0 flex-1 cursor-pointer truncate text-left text-sm font-bold text-gray-800 dark:text-gray-100"
                                                >
                                                    {s.label}
                                                </button>
                                                <Tooltip label="Rename">
                                                    <button
                                                        type="button"
                                                        onClick={() => startRenameSet(s.key, s.label)}
                                                        aria-label={`Rename ${s.label}`}
                                                        className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-gray-500 hover:bg-gray-900/5 dark:text-gray-400 dark:hover:bg-gray-100/10"
                                                    >
                                                        <Pencil size={13} />
                                                    </button>
                                                </Tooltip>
                                                <Tooltip label="Delete script">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteSet(s.key, s.label)}
                                                        aria-label={`Delete ${s.label}`}
                                                        className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-red-600 hover:bg-red-500/15 dark:text-red-400"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </Tooltip>
                                            </>
                                        )}
                                    </div>
                                )
                            })}
                            {sets.length === 0 && (
                                <p className="px-1 py-2 text-sm text-gray-500 dark:text-gray-400">No scripts yet.</p>
                            )}
                        </div>
                    )}
                    <div className="mt-3 border-t border-gray-900/5 pt-3 dark:border-gray-100/10">
                        {creatingSet ? (
                            <div className="flex items-center gap-1.5">
                                <input
                                    autoFocus
                                    value={newSetLabel}
                                    onChange={(e) => setNewSetLabel(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleCreateSet()
                                        if (e.key === 'Escape') {
                                            setCreatingSet(false)
                                            setNewSetLabel('')
                                        }
                                    }}
                                    placeholder="Script name…"
                                    className="min-w-0 flex-1 rounded-lg border-2 border-gray-900/10 bg-transparent px-2 py-1.5 text-sm font-semibold text-gray-900 outline-none focus:border-teal-400 dark:border-gray-100/10 dark:text-gray-50"
                                />
                                <button
                                    type="button"
                                    onClick={handleCreateSet}
                                    disabled={createSetMutation.isPending || !newSetLabel.trim()}
                                    className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg bg-teal-500 text-white hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    {createSetMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setCreatingSet(false)
                                        setNewSetLabel('')
                                    }}
                                    className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-gray-500 hover:bg-gray-900/5 dark:text-gray-400 dark:hover:bg-gray-100/10"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setCreatingSet(true)}
                                className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-gray-900/15 py-2 text-sm font-bold text-gray-600 hover:bg-gray-900/5 dark:border-gray-100/15 dark:text-gray-300 dark:hover:bg-gray-100/10"
                            >
                                <Plus size={15} /> New script
                            </button>
                        )}
                    </div>
                </section>

                {/* Sentences for the selected script */}
                <section className="rounded-3xl border border-gray-900/5 bg-white p-5 shadow-sm dark:border-gray-100/10 dark:bg-gray-900 sm:p-7">
                    {!effectiveSetKey ? (
                        <div className="rounded-2xl border border-dashed border-gray-900/15 p-10 text-center text-sm text-gray-500 dark:border-gray-100/15 dark:text-gray-400">
                            {loadingSets ? 'Loading…' : 'Create a script on the left to get started.'}
                        </div>
                    ) : (
                        <>
                            <div className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-teal-700 dark:text-teal-300">
                                <FileText size={14} /> Script
                            </div>
                            <h1 className="mb-1 text-xl font-extrabold text-gray-900 dark:text-gray-50">
                                {selectedSet?.label ?? effectiveSetKey}
                            </h1>
                            <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
                                {sentences.length} sentence{sentences.length === 1 ? '' : 's'}. Use the arrows to reorder.
                            </p>
                            {loadingSentences ? (
                                <div className="flex items-center justify-center py-14 text-sm text-gray-500 dark:text-gray-400">
                                    <Loader2 size={16} className="mr-2 animate-spin" /> Loading sentences…
                                </div>
                            ) : sentencesError ? (
                                <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                                    Couldn't load sentences: {sentencesError instanceof Error ? sentencesError.message : 'Something went wrong.'}
                                </p>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    {sentences.map((s, i) => {
                                        const isEditing = editingSentenceId === s.id
                                        return (
                                            <div
                                                key={s.id}
                                                className="flex items-start gap-2 rounded-2xl border border-gray-900/5 p-3 dark:border-gray-100/10"
                                            >
                                                <div className="flex shrink-0 flex-col gap-0.5 pt-0.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => moveSentence(i, -1)}
                                                        disabled={i === 0 || reorderMutation.isPending}
                                                        aria-label="Move up"
                                                        className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-gray-500 hover:bg-gray-900/5 disabled:cursor-not-allowed disabled:opacity-30 dark:text-gray-400 dark:hover:bg-gray-100/10"
                                                    >
                                                        <ChevronUp size={15} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => moveSentence(i, 1)}
                                                        disabled={i === sentences.length - 1 || reorderMutation.isPending}
                                                        aria-label="Move down"
                                                        className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-gray-500 hover:bg-gray-900/5 disabled:cursor-not-allowed disabled:opacity-30 dark:text-gray-400 dark:hover:bg-gray-100/10"
                                                    >
                                                        <ChevronDown size={15} />
                                                    </button>
                                                </div>
                                                <span className="mt-1.5 shrink-0 text-xs font-bold text-gray-400 dark:text-gray-500">
                                                    {i + 1}.
                                                </span>
                                                <div className="min-w-0 flex-1">
                                                    {isEditing ? (
                                                        <textarea
                                                            autoFocus
                                                            value={editingSentenceText}
                                                            onChange={(e) => setEditingSentenceText(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                                    e.preventDefault()
                                                                    handleSaveSentence()
                                                                }
                                                                if (e.key === 'Escape') setEditingSentenceId(null)
                                                            }}
                                                            rows={2}
                                                            className="w-full resize-none rounded-lg border-2 border-teal-400 bg-transparent px-2 py-1.5 text-sm font-semibold text-gray-900 outline-none dark:text-gray-50"
                                                        />
                                                    ) : (
                                                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{s.text}</p>
                                                    )}
                                                </div>
                                                <div className="flex shrink-0 items-center gap-1">
                                                    {isEditing ? (
                                                        <>
                                                            <button
                                                                type="button"
                                                                onClick={handleSaveSentence}
                                                                disabled={updateSentenceMutation.isPending || !editingSentenceText.trim()}
                                                                aria-label="Save"
                                                                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-teal-600 hover:bg-teal-500/15 disabled:opacity-50 dark:text-teal-400"
                                                            >
                                                                <Check size={14} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setEditingSentenceId(null)}
                                                                aria-label="Cancel"
                                                                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-gray-500 hover:bg-gray-900/5 dark:text-gray-400 dark:hover:bg-gray-100/10"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Tooltip label="Edit">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => startEditSentence(s.id, s.text)}
                                                                    aria-label="Edit sentence"
                                                                    className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-gray-500 hover:bg-gray-900/5 dark:text-gray-400 dark:hover:bg-gray-100/10"
                                                                >
                                                                    <Pencil size={13} />
                                                                </button>
                                                            </Tooltip>
                                                            <Tooltip label="Delete">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDeleteSentence(s.id, s.text)}
                                                                    aria-label="Delete sentence"
                                                                    className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-red-600 hover:bg-red-500/15 dark:text-red-400"
                                                                >
                                                                    <Trash2 size={13} />
                                                                </button>
                                                            </Tooltip>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                    {sentences.length === 0 && (
                                        <p className="rounded-2xl border border-dashed border-gray-900/15 p-8 text-center text-sm text-gray-500 dark:border-gray-100/15 dark:text-gray-400">
                                            No sentences yet — add the first one below.
                                        </p>
                                    )}
                                </div>
                            )}
                            <div className="mt-4 flex items-start gap-2">
                                <textarea
                                    value={newSentenceText}
                                    onChange={(e) => setNewSentenceText(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault()
                                            handleAddSentence()
                                        }
                                    }}
                                    rows={2}
                                    placeholder="Add a new sentence…"
                                    className="min-w-0 flex-1 resize-none rounded-xl border-2 border-gray-900/10 bg-transparent px-3 py-2 text-sm font-semibold text-gray-900 outline-none focus:border-teal-400 dark:border-gray-100/10 dark:text-gray-50"
                                />
                                <button
                                    type="button"
                                    onClick={handleAddSentence}
                                    disabled={createSentenceMutation.isPending || !newSentenceText.trim()}
                                    className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-teal-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-600 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-teal-600"
                                >
                                    {createSentenceMutation.isPending ? (
                                        <Loader2 size={15} className="animate-spin" />
                                    ) : (
                                        <Plus size={15} />
                                    )}
                                    Add
                                </button>
                            </div>
                        </>
                    )}
                </section>
            </div>
        </div>
    )
}