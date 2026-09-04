// File: src/pages/students/remediation/session/features/remediationSessionStrings.ts
//
// Bilingual copy for the remediation session (flashcard drill) page —
// split out of RemediationSession.tsx to keep that file focused on
// behavior, mirroring the results/features/attemptResultsStrings.ts
// convention used elsewhere in this app.
import type { Lang } from '../../../../../components/buttons/LangToggle'

export const STRINGS: Record<Lang, {
    loading: string
    notFoundTitle: string
    notFoundDesc: string
    backButton: string
    emptyTitle: string
    emptyDesc: string
    wordCounter: (current: number, total: number) => string
    practicedBadge: (count: number, total: number) => string
    markPracticed: string
    markedPracticed: string
    prev: string
    next: string
    finish: string
    endEarly: string
    occurrences: (n: number) => string
    completionTitle: string
    completionDesc: (count: number, total: number) => string
    completionAllDone: string
    backToMaterialButton: string
    wordListTitle: string
}> = {
    fil: {
        loading: 'Kinukuha ang remediation session...',
        notFoundTitle: 'Hindi Nahanap',
        notFoundDesc: 'Hindi na available ang remediation material na ito.',
        backButton: 'Bumalik',
        emptyTitle: 'Walang salita dito.',
        emptyDesc: 'Wala talagang salitang naka-imbak sa remediation material na ito.',
        wordCounter: (current, total) => `Salita ${current} sa ${total}`,
        practicedBadge: (count, total) => `${count}/${total} nasanay na`,
        markPracticed: 'Markahan bilang Nasanay',
        markedPracticed: 'Nasanay na ✓',
        prev: 'Nakaraan',
        next: 'Susunod',
        finish: 'Tapusin ang Session',
        endEarly: 'Tapusin nang Maaga',
        occurrences: (n) => `Lumabas ng ${n}x sa pagbasa`,
        completionTitle: 'Tapos na ang Session!',
        completionDesc: (count, total) => `Nasanay ang ${count} sa ${total} salita ngayong session.`,
        completionAllDone: 'Nasanay lahat ng salita — magaling!',
        backToMaterialButton: 'Bumalik sa Remediation Material',
        wordListTitle: 'Listahan ng mga Salita',
    },
    en: {
        loading: 'Loading remediation session...',
        notFoundTitle: 'Not Found',
        notFoundDesc: "This remediation material isn't available anymore.",
        backButton: 'Back',
        emptyTitle: 'No words here.',
        emptyDesc: 'This remediation material has no words stored on it.',
        wordCounter: (current, total) => `Word ${current} of ${total}`,
        practicedBadge: (count, total) => `${count}/${total} practiced`,
        markPracticed: 'Mark Practiced',
        markedPracticed: 'Practiced ✓',
        prev: 'Previous',
        next: 'Next',
        finish: 'Finish Session',
        endEarly: 'End Session Early',
        occurrences: (n) => `Appeared ${n}x in the reading`,
        completionTitle: 'Session Complete!',
        completionDesc: (count, total) => `${count} of ${total} words practiced this session.`,
        completionAllDone: 'Every word was practiced — nice work!',
        backToMaterialButton: "Back to Remediation Material",
        wordListTitle: 'Word List',
    },
}