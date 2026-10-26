import React, { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type PaginationProps = {
    page: number // 0-indexed
    pageCount: number
    onPageChange: (page: number) => void
    className?: string
}

// Up to this many pages every number is shown; beyond it the list shrinks to
// the first page, the last page and the neighbours of the current one, and a
// "go to page" box appears.
const SHOW_ALL_UP_TO = 7

type PageItem = number | 'gap-start' | 'gap-end'

const pageItems = (page: number, pageCount: number): PageItem[] => {
    if (pageCount <= SHOW_ALL_UP_TO) return Array.from({ length: pageCount }, (_, i) => i)

    const first = 0
    const last = pageCount - 1
    const from = Math.max(first + 1, page - 1)
    const to = Math.min(last - 1, page + 1)

    const items: PageItem[] = [first]
    if (from > first + 1) items.push('gap-start')
    for (let p = from; p <= to; p++) items.push(p)
    if (to < last - 1) items.push('gap-end')
    items.push(last)
    return items
}

const arrowClass =
    'flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors duration-200 hover:bg-gray-900/5 disabled:opacity-30 disabled:hover:bg-transparent dark:text-gray-400 dark:hover:bg-gray-100/10'

export const Pagination: React.FC<PaginationProps> = ({ page, pageCount, onPageChange, className = '' }) => {
    const [jumpValue, setJumpValue] = useState('')

    if (pageCount <= 1) return null

    const jump = () => {
        const target = Number(jumpValue)
        if (!Number.isInteger(target)) return
        onPageChange(Math.min(pageCount, Math.max(1, target)) - 1)
        setJumpValue('')
    }

    return (
        <div className={`flex flex-wrap items-center justify-center gap-x-4 gap-y-2 ${className}`}>
            <nav aria-label="Pagination" className="flex items-center justify-center gap-1.5">
                <button
                    type="button"
                    onClick={() => onPageChange(Math.max(0, page - 1))}
                    disabled={page === 0}
                    aria-label="Previous page"
                    className={arrowClass}
                >
                    <ChevronLeft size={16} />
                </button>
                {pageItems(page, pageCount).map((item) =>
                    typeof item === 'string' ? (
                        <span key={item} aria-hidden="true" className="w-6 text-center text-sm font-bold text-gray-400">
                            …
                        </span>
                    ) : (
                        <button
                            key={item}
                            type="button"
                            onClick={() => onPageChange(item)}
                            aria-current={item === page ? 'page' : undefined}
                            className={`flex h-8 min-w-8 items-center justify-center rounded-lg px-1.5 text-sm font-bold transition-colors duration-200 ${
                                item === page
                                    ? 'bg-gray-900 text-white dark:bg-gray-50 dark:text-gray-900'
                                    : 'text-gray-500 hover:bg-gray-900/5 dark:text-gray-400 dark:hover:bg-gray-100/10'
                            }`}
                        >
                            {item + 1}
                        </button>
                    ),
                )}
                <button
                    type="button"
                    onClick={() => onPageChange(Math.min(pageCount - 1, page + 1))}
                    disabled={page === pageCount - 1}
                    aria-label="Next page"
                    className={arrowClass}
                >
                    <ChevronRight size={16} />
                </button>
            </nav>

            {pageCount > SHOW_ALL_UP_TO && (
                <form
                    onSubmit={(e) => {
                        e.preventDefault()
                        jump()
                    }}
                    className="flex items-center gap-1.5 text-sm font-bold text-gray-500 dark:text-gray-400"
                >
                    <label htmlFor="pagination-jump">Go to</label>
                    <input
                        id="pagination-jump"
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={pageCount}
                        value={jumpValue}
                        onChange={(e) => setJumpValue(e.target.value)}
                        placeholder={`1–${pageCount}`}
                        className="h-8 w-20 rounded-lg border border-gray-900/15 bg-transparent px-2 text-center text-sm font-bold text-gray-900 outline-none focus:border-gray-900/50 dark:border-gray-100/20 dark:text-gray-50 dark:focus:border-gray-100/60"
                    />
                    <button
                        type="submit"
                        disabled={jumpValue === ''}
                        className="h-8 rounded-lg px-2.5 text-sm font-bold text-gray-900 transition-colors duration-200 hover:bg-gray-900/5 disabled:opacity-30 disabled:hover:bg-transparent dark:text-gray-50 dark:hover:bg-gray-100/10"
                    >
                        Go
                    </button>
                </form>
            )}
        </div>
    )
}

export default Pagination
