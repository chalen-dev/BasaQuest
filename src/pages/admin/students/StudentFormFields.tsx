// File: src/pages/admin/students/StudentFormFields.tsx
import { Text } from '../../../components/input/Text'
import { Number as NumberInput } from '../../../components/input/Number'
import { Select } from '../../../components/input/Select'
import { TextArea } from '../../../components/input/TextArea'
import { GenderBadge } from '../genderDisplay'
import type { NewFinetuneStudent, ReadingTier } from '../useFinetuneStudents.ts'
const GENDER_OPTIONS = [
    { value: '', label: '—' },
    { value: 'female', label: 'Female' },
    { value: 'male', label: 'Male' },
]
const TIER_OPTIONS = [
    { value: '', label: '—' },
    { value: 'below', label: 'Below grade level' },
    { value: 'on', label: 'On grade level' },
    { value: 'above', label: 'Above grade level' },
]
type Props = {
    value: NewFinetuneStudent
    onChange: (next: NewFinetuneStudent) => void
}
export default function StudentFormFields({ value, onChange }: Props) {
    return (
        <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
                <Text
                    name="full_name"
                    label="Full name"
                    value={value.full_name}
                    onChange={(e) => onChange({ ...value, full_name: e.target.value })}
                    required
                />
            </div>
            <NumberInput
                name="grade_level"
                label="Grade level"
                value={value.grade_level ?? ''}
                min={1}
                max={6}
                onChange={(e) => onChange({ ...value, grade_level: e.target.value ? Number(e.target.value) : null })}
            />
            <div>
                <Select
                    name="gender"
                    label="Gender"
                    value={value.gender ?? ''}
                    options={GENDER_OPTIONS}
                    onChange={(e) => onChange({ ...value, gender: e.target.value || null })}
                />
                {/* Native <select> options can't carry icons/color, so the
                chosen gender's icon + color show here as a live preview
                instead — same GenderBadge used everywhere else it appears. */}
                <div className="mt-1.5">
                    <GenderBadge gender={value.gender} />
                </div>
            </div>
            <div className="sm:col-span-2">
                <Select
                    name="reading_tier"
                    label="Reading tier"
                    value={value.reading_tier ?? ''}
                    options={TIER_OPTIONS}
                    onChange={(e) => onChange({ ...value, reading_tier: (e.target.value || null) as ReadingTier | null })}
                />
            </div>
            <div className="sm:col-span-2">
                <TextArea
                    name="notes"
                    label="Notes"
                    value={value.notes ?? ''}
                    onChange={(e) => onChange({ ...value, notes: e.target.value || null })}
                    rows={2}
                />
            </div>
        </div>
    )
}