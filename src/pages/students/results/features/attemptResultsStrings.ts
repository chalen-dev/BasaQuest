// File: src/pages/students/results/features/attemptResultsStrings.ts
//
// STRINGS record for AttemptResults.tsx and its sibling features/
// components (AttemptResultsReviewGrid.tsx, AttemptInsights.tsx) —
// pulled out of AttemptResults.tsx itself once that file grew too
// large. Mirrors review/features/attemptWordReviewStrings.ts's own
// separation from AttemptWordReview.tsx.
import type { Lang } from '../../../../components/buttons/LangToggle'
export const STRINGS: Record<Lang, {
    loading: string
    notFoundTitle: string
    notFoundDesc: string
    unnamedStudent: string
    resultsTabTitle: string
    resultsTabSubtitle: string
    editButton: string
    editConfirmTitle: string
    editConfirmText: string
    editConfirmButton: string
    insightsTitle: string
    insightsSubtitle: string
    weaknessCardTitle: string
    weaknessCardDesc: (type: string, count: number, total: number) => string
    wcpmCardTitle: string
    wcpmUnit: string
    agreementCardTitle: string
    agreementCardDesc: (agreed: number, total: number) => string
    summaryNoErrors: (name: string) => string
    summaryWeakness: (name: string, type: string, count: number, total: number) => string
    summaryWcpm: (name: string, wcpm: number) => string
    summaryAgreement: (agreed: number, total: number) => string
    generateButton: string
    generatingButton: string
    generateSuccessToast: string
    generateErrorToast: string
    viewRemediationButton: string
}> = {
    fil: {
        loading: 'Kinukuha ang resulta...',
        notFoundTitle: 'Hindi Nahanap',
        notFoundDesc: 'Hindi na available ang pagbasang ito.',
        unnamedStudent: 'Estudyante',
        resultsTabTitle: 'Mga Marka',
        resultsTabSubtitle: 'Ang mga marka ng pagbasang ito sa bawat sukatan.',
        editButton: 'I-edit ang Resulta',
        editConfirmTitle: 'Buksan muli ang pagsusuring ito?',
        editConfirmText: 'Babalik ito sa Naghihintay ng Review at hindi na ito lalabas dito hangga\'t hindi mo ito muling kinukumpirma.',
        editConfirmButton: 'Oo, buksan muli',
        insightsTitle: 'Mga Insight',
        insightsSubtitle: 'Mabilisang buod ng mga pattern sa pagbasang ito.',
        weaknessCardTitle: 'Pangunahing Kahinaan',
        weaknessCardDesc: (type, count, total) => `${type} — ${count} sa ${total} salitang may mali`,
        wcpmCardTitle: 'Salitang Tama Kada Minuto',
        wcpmUnit: 'salita/min',
        agreementCardTitle: 'Pagkakasundo sa Sistema',
        agreementCardDesc: (agreed, total) => `Sumang-ayon ka sa ${agreed} sa ${total} salitang na-flag ng sistema`,
        summaryNoErrors: (name) => `Walang kapansin-pansing pagkakamali si ${name} sa pagbasang ito.`,
        summaryWeakness: (name, type, count, total) =>
            `Ang pinakamadalas na uri ng mali ni ${name} ay ${type}, na naganap sa ${count} sa ${total} salitang na-flag.`,
        summaryWcpm: (name, wcpm) => `Nakabasa si ${name} nang humigit-kumulang ${wcpm} tamang salita kada minuto.`,
        summaryAgreement: (agreed, total) =>
            `Sinang-ayunan mo ang ${agreed} sa ${total} salitang na-flag ng sistema bilang hindi sigurado.`,
        generateButton: 'Gumawa ng Remediation Material',
        generatingButton: 'Ginagawa...',
        generateSuccessToast: 'Nagawa ang bagong remediation material.',
        generateErrorToast: 'Hindi nagawa ang remediation material. Subukan ulit.',
        viewRemediationButton: "Tingnan ang Remediation List",
    },
    en: {
        loading: 'Loading results...',
        notFoundTitle: 'Not Found',
        notFoundDesc: "This reading isn't available anymore.",
        unnamedStudent: 'Student',
        resultsTabTitle: 'Results',
        resultsTabSubtitle: "This reading's scores across every metric.",
        editButton: 'Edit Results',
        editConfirmTitle: 'Reopen this review?',
        editConfirmText: "This will move it back to Pending Review, and it won't show up here again until you confirm it again.",
        editConfirmButton: 'Yes, reopen it',
        insightsTitle: 'Insights',
        insightsSubtitle: 'A quick summary of the patterns in this reading.',
        weaknessCardTitle: 'Dominant Weakness',
        weaknessCardDesc: (type, count, total) => `${type} — ${count} of ${total} flagged words`,
        wcpmCardTitle: 'Words Correct Per Minute',
        wcpmUnit: 'words/min',
        agreementCardTitle: 'Agreement with System',
        agreementCardDesc: (agreed, total) => `You agreed with ${agreed} of ${total} system-flagged words`,
        summaryNoErrors: (name) => `${name} had no notable errors flagged in this reading.`,
        summaryWeakness: (name, type, count, total) =>
            `${name}'s most common error type was ${type}, occurring in ${count} of the ${total} flagged words.`,
        summaryWcpm: (name, wcpm) => `${name} read at approximately ${wcpm} correct words per minute.`,
        summaryAgreement: (agreed, total) =>
            `You agreed with ${agreed} of the ${total} words the system flagged as uncertain.`,
        generateButton: 'Generate Remediation Material',
        generatingButton: 'Generating...',
        generateSuccessToast: 'New remediation material was generated.',
        generateErrorToast: "Couldn't generate remediation material. Please try again.",
        viewRemediationButton: "View Pupil's Remediation List",
    },
}
export type AttemptResultsStrings = (typeof STRINGS)['en']