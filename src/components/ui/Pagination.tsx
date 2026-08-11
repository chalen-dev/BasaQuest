import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type PaginationProps = {
    page: number // 0-indexed
    pageCount: number
    onPageChange: (page: number) => void
    className?: string
}

export const Pagination: React.FC<PaginationProps> = ({ page, pageCount, onPageChange, className = '' }) => {
    if (pageCount <= 1) return null

    const pages = Array.from({ length: pageCount }, (_, i) => i)

    return (
        <div className={`flex items-center justify-center gap-1.5 ${className}`}>
            <button
                type="button"
                onClick={() => onPageChange(Math.max(0, page - 1))}
                disabled={page === 0}
                aria-label="Previous page"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors duration-200 hover:bg-gray-900/5 disabled:opacity-30 disabled:hover:bg-transparent dark:text-gray-400 dark:hover:bg-gray-100/10"
            >
                <ChevronLeft size={16} />
            </button>
            {pages.map((p) => (
                <button
                    key={p}
                    type="button"
                    onClick={() => onPageChange(p)}
                    aria-current={p === page ? 'page' : undefined}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold transition-colors duration-200 ${
                        p === page
                            ? 'bg-gray-900 text-white dark:bg-gray-50 dark:text-gray-900'
                            : 'text-gray-500 hover:bg-gray-900/5 dark:text-gray-400 dark:hover:bg-gray-100/10'
                    }`}
                >
                    {p + 1}
                </button>
            ))}
            <button
                type="button"
                onClick={() => onPageChange(Math.min(pageCount - 1, page + 1))}
                disabled={page === pageCount - 1}
                aria-label="Next page"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors duration-200 hover:bg-gray-900/5 disabled:opacity-30 disabled:hover:bg-transparent dark:text-gray-400 dark:hover:bg-gray-100/10"
            >
                <ChevronRight size={16} />
            </button>
        </div>
    )
}

export default Pagination