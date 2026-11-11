// File: src/helpers/personName.ts
//
// A person's name as separate parts, and how they combine. The database keeps
// profiles.full_name in step with the parts (see the add_name_parts migration);
// this mirrors that rule so forms can show the same text before saving.
export type NameParts = {
    firstName: string
    middleInitial: string
    lastName: string
    suffix: string
}

export const EMPTY_NAME: NameParts = { firstName: '', middleInitial: '', lastName: '', suffix: '' }

// One capital letter, no dot: "c." / " C" -> "C".
export function cleanMiddleInitial(value: string): string {
    return value.replace(/[^\p{L}]/gu, '').slice(0, 1).toUpperCase()
}

// "Maria C. Santos Jr."
export function formatFullName(p: NameParts): string {
    const mi = cleanMiddleInitial(p.middleInitial)
    return [p.firstName.trim(), mi ? `${mi}.` : '', p.lastName.trim(), p.suffix.trim()].filter(Boolean).join(' ')
}

// Parts from a profile row. Rows that only have a full name (old accounts)
// are split at the last space so the form is not empty.
export function namePartsFromProfile(row: {
    first_name?: string | null
    middle_initial?: string | null
    last_name?: string | null
    suffix?: string | null
    full_name?: string | null
}): NameParts {
    if (row.first_name || row.last_name) {
        return {
            firstName: row.first_name ?? '',
            middleInitial: row.middle_initial ?? '',
            lastName: row.last_name ?? '',
            suffix: row.suffix ?? '',
        }
    }
    const full = (row.full_name ?? '').trim()
    const at = full.lastIndexOf(' ')
    if (at === -1) return { ...EMPTY_NAME, firstName: full }
    return { ...EMPTY_NAME, firstName: full.slice(0, at), lastName: full.slice(at + 1) }
}

// What goes into the profile update: the parts (empty -> null) plus the combined name.
export function namePartsToColumns(p: NameParts) {
    const first = p.firstName.trim() || null
    const last = p.lastName.trim() || null
    const full = formatFullName(p)
    return {
        first_name: first,
        middle_initial: cleanMiddleInitial(p.middleInitial) || null,
        last_name: last,
        suffix: p.suffix.trim() || null,
        full_name: full || null,
    }
}
