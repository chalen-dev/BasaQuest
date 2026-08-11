// File: src/pages/students/list/features/StudentRow.tsx
import React from 'react'
import { Ban, MonitorOff, Pencil, ShieldCheck, Trash2, UserRound } from 'lucide-react'
import type { StudentRow as StudentRowData } from '../hooks.ts'
import { Tooltip } from '../../../../components/ui/Tooltip.tsx'
type Strings = {
    gradeLabel: (n: number) => string
    nonReader: string
    noSection: string
    editAria: string
    deleteAria: string
    disableAria: string
    enableAria: string
    disabledBadge: string
    onlineLabel: string
    offlineLabel: string
    forceLogoutAria: string
}
interface StudentRowProps {
    student: StudentRowData
    isSelected: boolean
    isDeleting: boolean
    isTogglingStatus: boolean
    isOnline: boolean
    isForcingLogout: boolean
    t: Strings
    onSelect: () => void
    onEdit: () => void
    onDelete: (e: React.MouseEvent) => void
    onToggleStatus: (e: React.MouseEvent) => void
    onForceLogout: (e: React.MouseEvent) => void
}
export const StudentRow: React.FC<StudentRowProps> = ({
                                                          student,
                                                          isSelected,
                                                          isDeleting,
                                                          isTogglingStatus,
                                                          isOnline,
                                                          isForcingLogout,
                                                          t,
                                                          onSelect,
                                                          onEdit,
                                                          onDelete,
                                                          onToggleStatus,
                                                          onForceLogout,
                                                      }) => {
    const accent = student.is_non_reader ? '#f97316' : '#14b8a6'
    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onSelect}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onSelect()
            }}
            style={{ borderLeftColor: accent, borderLeftWidth: 6 }}
            className={`group flex w-full cursor-pointer items-center gap-4 rounded-2xl border-2 bg-white p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:bg-gray-900 ${
                isSelected
                    ? 'border-gray-900/20 ring-2 ring-teal-400/60 dark:border-gray-100/25'
                    : 'border-gray-900/5 dark:border-gray-100/10'
            } ${isDeleting ? 'opacity-50' : student.is_disabled ? 'opacity-60' : ''}`}
        >
            <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-base font-extrabold"
                style={{ background: `${accent}22`, color: accent }}
            >
                {student.full_name?.[0]?.toUpperCase() ?? student.username?.[0]?.toUpperCase() ?? <UserRound size={18} />}
            </span>
            <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-extrabold text-gray-900 dark:text-gray-50">
                        {student.full_name || student.username}
                    </span>
                    <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            isOnline
                                ? 'bg-green-500/15 text-green-600 dark:text-green-400'
                                : 'bg-gray-500/10 text-gray-500 dark:bg-gray-100/10 dark:text-gray-400'
                        }`}
                    >
                        {isOnline ? t.onlineLabel : t.offlineLabel}
                    </span>
                    {student.grade_level != null && (
                        <span className="rounded-full bg-gray-900/5 px-2.5 py-0.5 text-xs font-semibold text-gray-600 dark:bg-gray-100/10 dark:text-gray-300">
                            {t.gradeLabel(student.grade_level)}
                        </span>
                    )}
                    {student.is_non_reader && (
                        <span className="rounded-full bg-orange-500/15 px-2.5 py-0.5 text-xs font-semibold text-orange-600 dark:text-orange-400">
                            {t.nonReader}
                        </span>
                    )}
                    {student.is_disabled && (
                        <span className="rounded-full bg-red-500/15 px-2.5 py-0.5 text-xs font-semibold text-red-600 dark:text-red-400">
                            {t.disabledBadge}
                        </span>
                    )}
                </div>
                <div className="mt-0.5 text-sm font-medium text-gray-500 dark:text-gray-300">
                    @{student.username} · {student.section || t.noSection}
                </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
                <Tooltip label={t.forceLogoutAria}>
                    <button
                        type="button"
                        aria-label={t.forceLogoutAria}
                        disabled={isForcingLogout || student.is_disabled}
                        onClick={onForceLogout}
                        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-gray-500 transition-colors duration-200 hover:bg-violet-500/10 hover:text-violet-600 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-400 dark:hover:bg-violet-500/15 dark:hover:text-violet-400"
                    >
                        <MonitorOff size={16} />
                    </button>
                </Tooltip>
                <Tooltip label={t.editAria}>
                    <button
                        type="button"
                        aria-label={t.editAria}
                        onClick={(e) => {
                            e.stopPropagation()
                            onEdit()
                        }}
                        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-gray-500 transition-colors duration-200 hover:bg-gray-900/5 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-100/10 dark:hover:text-gray-50"
                    >
                        <Pencil size={16} />
                    </button>
                </Tooltip>
                <Tooltip label={student.is_disabled ? t.enableAria : t.disableAria}>
                    <button
                        type="button"
                        aria-label={student.is_disabled ? t.enableAria : t.disableAria}
                        disabled={isTogglingStatus}
                        onClick={onToggleStatus}
                        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-gray-500 transition-colors duration-200 hover:bg-amber-500/10 hover:text-amber-600 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-400 dark:hover:bg-amber-500/15 dark:hover:text-amber-400"
                    >
                        {student.is_disabled ? <ShieldCheck size={16} /> : <Ban size={16} />}
                    </button>
                </Tooltip>
                <Tooltip label={t.deleteAria}>
                    <button
                        type="button"
                        aria-label={t.deleteAria}
                        disabled={isDeleting}
                        onClick={onDelete}
                        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl text-gray-500 transition-colors duration-200 hover:bg-red-500/10 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-400 dark:hover:bg-red-500/15 dark:hover:text-red-400"
                    >
                        <Trash2 size={16} />
                    </button>
                </Tooltip>
            </div>
        </div>
    )
}
export default StudentRow