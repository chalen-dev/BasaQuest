// File: src/pages/admin/students/ConsentFiles.tsx
// Consent-form attachments for one finetune student — list, view (in a
// full-page modal with an "open in new tab" escape hatch, since the
// bucket is private so links are short-lived signed URLs), delete, and
// upload (capped at MAX_CONSENT_FILES, matching the DB trigger). Only
// rendered once a student has been saved (needs a real id to attach to).
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { FileText, Trash2, Upload, Eye, Loader2, X, ExternalLink } from 'lucide-react'
import { useTheme } from '../../../contexts/ThemeContext'
import { showConfirmation, showToast } from '../../../helpers/swalHelpers'
import {
    useConsentFilesQuery,
    useUploadConsentFileMutation,
    useDeleteConsentFileMutation,
    useConsentFileSignedUrl,
    MAX_CONSENT_FILES,
    type ConsentFile,
} from '../useConsentFiles.ts'

type Props = {
    studentId: string
}

function isPdfFile(file: ConsentFile) {
    const name = (file.original_filename ?? file.storage_path).toLowerCase()
    return name.endsWith('.pdf')
}

export default function ConsentFiles({ studentId }: Props) {
    const { theme } = useTheme()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const { data, isLoading } = useConsentFilesQuery(studentId)
    const files = data ?? []
    const uploadMutation = useUploadConsentFileMutation(studentId)
    const deleteMutation = useDeleteConsentFileMutation(studentId)
    const signedUrlMutation = useConsentFileSignedUrl()
    const [viewingId, setViewingId] = useState<string | null>(null)
    const [preview, setPreview] = useState<{ file: ConsentFile; url: string } | null>(null)
    const atLimit = files.length >= MAX_CONSENT_FILES

    useEffect(() => {
        if (!preview) return
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setPreview(null)
        }
        document.addEventListener('keydown', handleKey)
        return () => document.removeEventListener('keydown', handleKey)
    }, [preview])

    const handlePick = () => {
        if (!atLimit) fileInputRef.current?.click()
    }

    const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        e.target.value = ''
        if (!file) return
        try {
            await uploadMutation.mutateAsync(file)
            showToast('File attached.', 'success', theme === 'dark', { timer: 1200 })
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Failed to upload file.', 'error', theme === 'dark')
        }
    }

    const handleView = async (file: ConsentFile) => {
        setViewingId(file.id)
        try {
            const url = await signedUrlMutation.mutateAsync(file.storage_path)
            setPreview({ file, url })
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Failed to open file.', 'error', theme === 'dark')
        } finally {
            setViewingId(null)
        }
    }

    const handleDelete = async (file: ConsentFile) => {
        const confirmed = await showConfirmation(
            'Remove this file?',
            `This deletes "${file.original_filename ?? 'this file'}" permanently.`,
            theme === 'dark',
            'warning',
            'Yes, remove',
        )
        if (!confirmed) return
        try {
            await deleteMutation.mutateAsync(file)
            showToast('Removed.', 'success', theme === 'dark', { timer: 1200 })
            if (preview?.file.id === file.id) setPreview(null)
        } catch (err) {
            showToast(err instanceof Error ? err.message : 'Failed to remove file.', 'error', theme === 'dark')
        }
    }

    return (
        <div>
            <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Consent files</label>
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                    {files.length}/{MAX_CONSENT_FILES}
                </span>
            </div>
            <p className="mt-0.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                Scanned or photographed parent consent forms — up to {MAX_CONSENT_FILES}, at least 1 recommended once
                consent is marked on file.
            </p>

            <div className="mt-2 flex flex-col gap-2">
                {isLoading ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <Loader2 size={14} className="animate-spin" /> Loading files…
                    </div>
                ) : (
                    files.map((file) => (
                        <div
                            key={file.id}
                            className="flex items-center gap-2 rounded-xl border border-gray-900/10 bg-gray-900/[0.02] px-3 py-2 dark:border-gray-100/10 dark:bg-gray-100/[0.02]"
                        >
                            <FileText size={16} className="shrink-0 text-gray-500 dark:text-gray-400" />
                            <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-700 dark:text-gray-300">
                                {file.original_filename ?? file.storage_path.split('/').pop()}
                            </span>
                            <button
                                type="button"
                                onClick={() => handleView(file)}
                                disabled={viewingId === file.id}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors duration-150 hover:bg-gray-900/5 hover:text-gray-900 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-gray-100/10 dark:hover:text-gray-50"
                                aria-label="View"
                            >
                                {viewingId === file.id ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
                            </button>
                            <button
                                type="button"
                                onClick={() => handleDelete(file)}
                                disabled={deleteMutation.isPending && deleteMutation.variables?.id === file.id}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors duration-150 hover:bg-red-500/10 hover:text-red-600 disabled:opacity-50 dark:text-gray-400 dark:hover:bg-red-500/15 dark:hover:text-red-400"
                                aria-label="Remove"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))
                )}
                {!isLoading && files.length === 0 && (
                    <p className="rounded-xl border border-dashed border-gray-900/15 px-3 py-2.5 text-xs font-medium text-gray-500 dark:border-gray-100/15 dark:text-gray-400">
                        No files attached yet.
                    </p>
                )}
            </div>

            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="application/pdf,image/*" className="hidden" />
            <button
                type="button"
                onClick={handlePick}
                disabled={atLimit || uploadMutation.isPending}
                className="mt-2 flex items-center gap-1.5 rounded-lg bg-gray-100 px-3.5 py-2 text-xs font-bold text-gray-700 transition-colors duration-150 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
                {uploadMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                {atLimit ? 'Limit reached' : uploadMutation.isPending ? 'Uploading…' : 'Upload file'}
            </button>

            {/* Full-page preview modal — covers everything, including the
            drawer this component lives inside, since z-[60] beats the
            drawer's z-50. Backdrop click or Escape closes it; the header
            offers an explicit "open in new tab" escape hatch instead of
            defaulting straight to a new tab. */}
            {preview && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-950/80 p-4"
                    onClick={() => setPreview(null)}
                >
                    <div
                        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3 border-b border-gray-900/10 px-5 py-4 dark:border-gray-100/10">
                            <FileText size={18} className="shrink-0 text-gray-500 dark:text-gray-400" />
                            <span className="min-w-0 flex-1 truncate text-sm font-bold text-gray-900 dark:text-gray-50">
                                {preview.file.original_filename ?? preview.file.storage_path.split('/').pop()}
                            </span>
                            <a href={preview.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex shrink-0 items-center gap-1.5 rounded-full border border-gray-900/10 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors duration-150 hover:bg-gray-900/5 dark:border-gray-100/10 dark:text-gray-300 dark:hover:bg-gray-100/10"
                            >
                            <ExternalLink size={13} /> Open in new tab
                            </a>
                        <button
                            type="button"
                            onClick={() => setPreview(null)}
                            aria-label="Close"
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors duration-150 hover:bg-gray-900/5 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-100/10 dark:hover:text-gray-50"
                        >
                            <X size={16} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-auto bg-gray-100 p-3 dark:bg-gray-950">
                        {isPdfFile(preview.file) ? (
                            <iframe
                                src={preview.url}
                                title="Consent file preview"
                                className="h-[75vh] w-full rounded-lg bg-white"
                            />
                        ) : (
                            <img
                                src={preview.url}
                                alt="Consent file preview"
                                className="mx-auto max-h-[75vh] w-auto rounded-lg"
                            />
                        )}
                    </div>
                </div>
                </div>
                )}
</div>
)
}