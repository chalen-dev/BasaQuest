// File: src/pages/students/list/features/StudentFilters.tsx
import React from 'react'
import { SearchInput } from '../../../../components/input/SearchInput.tsx'
import { Select } from '../../../../components/input/Select.tsx'
import type { OnlineFilter, ReaderFilter, SortOption, StatusFilter } from '../hooks.ts'

type Strings = {
    searchLabel: string
    searchPlaceholder: string
    sortLabel: string
    sortNameAsc: string
    sortNameDesc: string
    sortGradeAsc: string
    sortGradeDesc: string
    gradeFilterLabel: string
    gradeFilterAll: string
    gradeLabel: (n: number) => string
    readerFilterLabel: string
    readerFilterAll: string
    readerFilterReaders: string
    readerFilterNonReaders: string
    statusFilterLabel: string
    statusFilterEnabled: string
    statusFilterDisabled: string
    statusFilterAll: string
    onlineFilterLabel: string
    onlineFilterAll: string
    onlineFilterOnline: string
    onlineFilterOffline: string
}

const GRADE_OPTIONS = [1, 2, 3, 4, 5, 6]

interface StudentFiltersProps {
    t: Strings
    searchInput: string
    onSearchChange: (value: string) => void
    sort: SortOption
    onSortChange: (value: SortOption) => void
    gradeFilter: string
    onGradeFilterChange: (value: string) => void
    readerFilter: ReaderFilter
    onReaderFilterChange: (value: ReaderFilter) => void
    statusFilter: StatusFilter
    onStatusFilterChange: (value: StatusFilter) => void
    onlineFilter: OnlineFilter
    onOnlineFilterChange: (value: OnlineFilter) => void
}

export const StudentFilters: React.FC<StudentFiltersProps> = ({
                                                                  t,
                                                                  searchInput,
                                                                  onSearchChange,
                                                                  sort,
                                                                  onSortChange,
                                                                  gradeFilter,
                                                                  onGradeFilterChange,
                                                                  readerFilter,
                                                                  onReaderFilterChange,
                                                                  statusFilter,
                                                                  onStatusFilterChange,
                                                                  onlineFilter,
                                                                  onOnlineFilterChange,
                                                              }) => {
    const sortOptions = [
        { value: 'name_asc', label: t.sortNameAsc },
        { value: 'name_desc', label: t.sortNameDesc },
        { value: 'grade_asc', label: t.sortGradeAsc },
        { value: 'grade_desc', label: t.sortGradeDesc },
    ]
    const gradeFilterOptions = [
        { value: '', label: t.gradeFilterAll },
        ...GRADE_OPTIONS.map((n) => ({ value: String(n), label: t.gradeLabel(n) })),
    ]
    const readerFilterOptions = [
        { value: '', label: t.readerFilterAll },
        { value: 'reader', label: t.readerFilterReaders },
        { value: 'non_reader', label: t.readerFilterNonReaders },
    ]
    const statusFilterOptions = [
        { value: 'enabled', label: t.statusFilterEnabled },
        { value: 'disabled', label: t.statusFilterDisabled },
        { value: 'all', label: t.statusFilterAll },
    ]
    const onlineFilterOptions = [
        { value: '', label: t.onlineFilterAll },
        { value: 'online', label: t.onlineFilterOnline },
        { value: 'offline', label: t.onlineFilterOffline },
    ]

    return (
        <div className="flex flex-col gap-3">
            <SearchInput
                value={searchInput}
                onChange={onSearchChange}
                label={t.searchLabel}
                placeholder={t.searchPlaceholder}
            />
            <div className="flex flex-wrap gap-3 sm:items-end">
                <Select
                    name="sort"
                    label={t.sortLabel}
                    options={sortOptions}
                    value={sort}
                    onChange={(e) => onSortChange(e.target.value as SortOption)}
                    selectClassName="px-3.5 py-3"
                    className="min-w-[190px]"
                />
                <Select
                    name="gradeFilter"
                    label={t.gradeFilterLabel}
                    options={gradeFilterOptions}
                    value={gradeFilter}
                    onChange={(e) => onGradeFilterChange(e.target.value)}
                    selectClassName="px-3.5 py-3"
                    className="min-w-[150px]"
                />
                <Select
                    name="readerFilter"
                    label={t.readerFilterLabel}
                    options={readerFilterOptions}
                    value={readerFilter}
                    onChange={(e) => onReaderFilterChange(e.target.value as ReaderFilter)}
                    selectClassName="px-3.5 py-3"
                    className="min-w-[160px]"
                />
                <Select
                    name="statusFilter"
                    label={t.statusFilterLabel}
                    options={statusFilterOptions}
                    value={statusFilter}
                    onChange={(e) => onStatusFilterChange(e.target.value as StatusFilter)}
                    selectClassName="px-3.5 py-3"
                    className="min-w-[150px]"
                />
                <Select
                    name="onlineFilter"
                    label={t.onlineFilterLabel}
                    options={onlineFilterOptions}
                    value={onlineFilter}
                    onChange={(e) => onOnlineFilterChange(e.target.value as OnlineFilter)}
                    selectClassName="px-3.5 py-3"
                    className="min-w-[150px]"
                />
            </div>
        </div>
    )
}

export default StudentFilters