// File: src/pages/proficiency/foundational/data/levels.ts
// Registry of every Foundational level. To add a level: create its data file
// and add it to the list for its language. Filipino ("Mga Titik at Tunog", Antas 1-5)
// lives in data/fil/level1..5.ts and FILIPINO_LEVELS.
import type { FoundationalLevel } from './types.ts'
import { EN_LEVEL_1 } from './en/level1.ts'
import { EN_LEVEL_2 } from './en/level2.ts'
import { EN_LEVEL_3 } from './en/level3.ts'
import { EN_LEVEL_4 } from './en/level4.ts'
import { EN_LEVEL_5 } from './en/level5.ts'
import { FIL_LEVEL_1 } from './fil/level1.ts'
import { FIL_LEVEL_2 } from './fil/level2.ts'
import { FIL_LEVEL_3 } from './fil/level3.ts'
import { FIL_LEVEL_4 } from './fil/level4.ts'
import { FIL_LEVEL_5 } from './fil/level5.ts'

export const ENGLISH_LEVELS: FoundationalLevel[] = [EN_LEVEL_1, EN_LEVEL_2, EN_LEVEL_3, EN_LEVEL_4, EN_LEVEL_5]

export const FILIPINO_LEVELS: FoundationalLevel[] = [FIL_LEVEL_1, FIL_LEVEL_2, FIL_LEVEL_3, FIL_LEVEL_4, FIL_LEVEL_5]

export const ALL_FOUNDATIONAL_LEVELS: FoundationalLevel[] = [...FILIPINO_LEVELS, ...ENGLISH_LEVELS]

export function findFoundationalLevel(id: string | undefined): FoundationalLevel | undefined {
    return ALL_FOUNDATIONAL_LEVELS.find((level) => level.id === id)
}
