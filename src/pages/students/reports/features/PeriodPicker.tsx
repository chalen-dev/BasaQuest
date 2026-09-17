// File: src/pages/students/reports/features/PeriodPicker.tsx
//
// Shared between PupilProgressReport.tsx and ClassAnalyticsReport.tsx —
// both need the exact same "pick a reporting period" control (three
// day-count presets or a custom start/end date pair), so it's one
// component rather than two near-duplicates.
import React from 'react'
import { Select } from '../../../../components/input/Select'
import { DateInput } from '../../../../components/input/DateInput'
import type { PeriodPreset } from '../hooks'

export type PeriodPickerStrings = {
    periodLabel: string
    last30: string
    last60: string
    last90: string
    custom: string
    startLabel: string
    endLabel: string
}

interface PeriodPickerProps {
    t: PeriodPickerStrings
    preset: PeriodPreset
    onPresetChange: (value: PeriodPreset) => void
    customStart: string
    customEnd: string
    onCustomStartChange: (value: string) => void
    onCustomEndChange: (value: string) => void
    className?: string
}

export const PeriodPicker: React.FC<PeriodPickerProps> = ({
    t,
    preset,
    onPresetChange,
    customStart,
    customEnd,
    onCustomStartChange,
    onCustomEndChange,
    className = '',
}) => {
    return (
        <div className={`flex flex-wrap items-end gap-3 ${className}`}>
            <Select
                name="report-period-preset"
                label={t.periodLabel}
                value={preset}
                onChange={(e) => onPresetChange(e.target.value as PeriodPreset)}
                options={[
                    { value: '30', label: t.last30 },
                    { value: '60', label: t.last60 },
                    { value: '90', label: t.last90 },
                    { value: 'custom', label: t.custom },
                ]}
                selectClassName="px-3 py-2 text-sm"
                className="w-44"
            />
            {preset === 'custom' && (
                <>
                    <DateInput
                        name="report-period-start"
                        label={t.startLabel}
                        value={customStart}
                        onChange={(e) => onCustomStartChange(e.target.value)}
                        max={customEnd || undefined}
                        className="w-40"
                    />
                    <DateInput
                        name="report-period-end"
                        label={t.endLabel}
                        value={customEnd}
                        onChange={(e) => onCustomEndChange(e.target.value)}
                        min={customStart || undefined}
                        className="w-40"
                    />
                </>
            )}
        </div>
    )
}

export default PeriodPicker
