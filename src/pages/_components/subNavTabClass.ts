// File: src/pages/_components/subNavTabClass.ts
// Pill styling shared by the Students and Fluent Reading sub-navs. Inactive pills
// have a solid background so the animated backdrop never shows through them.
export const subNavTabClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 rounded-full px-5 py-2 text-base font-bold shadow-sm transition-colors duration-300 ${
        isActive
            ? 'bg-gray-900 text-white dark:bg-gray-50 dark:text-gray-900'
            : 'border border-gray-900/10 bg-white text-gray-600 hover:bg-gray-900/5 dark:border-gray-100/10 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-100/10'
    }`
