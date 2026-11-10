// File: src/pages/_components/subNavTabClass.ts
// Pill styling shared by the Students and Fluent Reading sub-navs. Inactive pills
// have a solid background so the animated backdrop never shows through them.
export const subNavTabClass = ({ isActive }: { isActive: boolean }) =>
    `flex cursor-pointer items-center gap-2 rounded-full px-5 py-2 text-base font-bold shadow-sm transition-[transform,background-color,border-color,box-shadow,color] duration-150 active:translate-y-0 active:scale-95 ${
        isActive
            ? 'bg-gray-900 text-white dark:bg-gray-50 dark:text-gray-900'
            : 'border border-gray-900/10 bg-white text-gray-600 hover:-translate-y-0.5 hover:border-teal-500/50 hover:bg-teal-500/10 hover:text-gray-900 hover:shadow-md dark:border-gray-100/10 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-teal-400/50 dark:hover:bg-teal-400/10 dark:hover:text-white'
    }`
