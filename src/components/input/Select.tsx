// File: src/components/input/Select.tsx
import React from 'react';
import { ChevronDown } from 'lucide-react';

interface Option {
    value: string | number;
    label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    name: string;
    options: readonly Option[];
    error?: string;
    className?: string;          // container margin
    selectClassName?: string;     // select padding
}

// Previously themed with CSS custom properties (var(--bg-main),
// var(--text-main), var(--border-color), var(--text-heading)) that are
// never defined anywhere in this project — no @theme block, no :root
// declaration. With those variables resolving to nothing, the browser fell
// back to its own default rendering for the select box and its dropdown
// popup, which is why it looked like a plain unstyled white control sitting
// oddly inside an otherwise dark-themed app. Restyled to match the same
// real Tailwind classes every other input component (Text, Password, etc.)
// already uses, and gave each <option> explicit light/dark classes —
// Chromium-based browsers honor background-color/color on <option> for the
// popup list, which is what actually themes the dropdown itself.
export const Select: React.FC<SelectProps> = ({
                                                  label,
                                                  name,
                                                  value,
                                                  options,
                                                  error,
                                                  className = '',
                                                  selectClassName = 'px-3 py-2',
                                                  ...rest
                                              }) => {
    const inputId = name;
    return (
        <div className={className}>
            {label && (
                <label htmlFor={inputId} className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {label}
                </label>
            )}
            <div className="relative">
                <select
                    id={inputId}
                    name={name}
                    value={value}
                    className={`w-full appearance-none pr-9 ${selectClassName} bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border rounded outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-gray-100 dark:disabled:bg-gray-800/50 disabled:cursor-not-allowed ${
                        error ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-700'
                    }`}
                    aria-invalid={!!error}
                    aria-describedby={error ? `${inputId}-error` : undefined}
                    {...rest}
                >
                    {options.map((option) => (
                        <option
                            key={option.value}
                            value={option.value}
                            className="bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100"
                        >
                            {option.label}
                        </option>
                    ))}
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500">
                    <ChevronDown size={16} />
                </div>
            </div>
            {error && (
                <p id={`${inputId}-error`} className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {error}
                </p>
            )}
        </div>
    );
};