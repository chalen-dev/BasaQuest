// File: src/components/input/NameFields.tsx
//
// First name, middle initial, last name and suffix as one block, used by the
// sign-up form, the profile page and the pupil form. Middle initial and suffix
// are always optional; `required` only covers first and last name.
import React from 'react'
import { TextInput } from './TextInput.tsx'
import { cleanMiddleInitial, type NameParts } from '../../helpers/personName.ts'
import { useLang } from '../../contexts/LangContext.tsx'

const LABELS = {
    fil: { first: 'Unang Pangalan', middle: 'Gitnang Inisyal', last: 'Apelyido', suffix: 'Hulapi (Jr., III)', optional: 'opsyonal' },
    en: { first: 'First name', middle: 'Middle initial', last: 'Last name', suffix: 'Suffix (Jr., III)', optional: 'optional' },
}

type Props = {
    value: NameParts
    onChange: (next: NameParts) => void
    required?: boolean
    inputClassName: string
    // Spacing under each field; defaults to the roomy form spacing.
    fieldClassName?: string
}

export const NameFields: React.FC<Props> = ({ value, onChange, required = false, inputClassName, fieldClassName = 'mb-4' }) => {
    const { lang } = useLang()
    const t = LABELS[lang]
    const set = (patch: Partial<NameParts>) => onChange({ ...value, ...patch })
    return (
        <div className="grid grid-cols-6 gap-x-4">
            <TextInput
                name="firstName"
                label={t.first}
                value={value.firstName}
                onChange={(e) => set({ firstName: e.target.value })}
                required={required}
                maxLength={60}
                className={`col-span-6 sm:col-span-4 ${fieldClassName}`}
                inputClassName={inputClassName}
            />
            <TextInput
                name="middleInitial"
                label={`${t.middle} (${t.optional})`}
                value={value.middleInitial}
                onChange={(e) => set({ middleInitial: cleanMiddleInitial(e.target.value) })}
                maxLength={2}
                className={`col-span-6 sm:col-span-2 ${fieldClassName}`}
                inputClassName={inputClassName}
            />
            <TextInput
                name="lastName"
                label={t.last}
                value={value.lastName}
                onChange={(e) => set({ lastName: e.target.value })}
                required={required}
                maxLength={60}
                className={`col-span-6 sm:col-span-4 ${fieldClassName}`}
                inputClassName={inputClassName}
            />
            <TextInput
                name="suffix"
                label={`${t.suffix} (${t.optional})`}
                value={value.suffix}
                onChange={(e) => set({ suffix: e.target.value })}
                maxLength={10}
                className={`col-span-6 sm:col-span-2 ${fieldClassName}`}
                inputClassName={inputClassName}
            />
        </div>
    )
}

export default NameFields
