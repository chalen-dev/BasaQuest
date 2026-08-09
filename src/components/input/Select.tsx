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
    selectClassName?: string;
}

export const Select: React.FC<SelectProps> = ({
                                                  label,
                                                  name,
                                                  value,
                                                  options,
                                                  error,
                                                  className = '',
                                                  selectClassName = '',
                                                  ...rest
                                              }) => {
    return (
        <div className={`flex flex-col ${className}`}>
            {label && (
                <label htmlFor={name} className="block mb-2 text-sm font-medium text-[var(--text-main)] opacity-70">
                    {label}
                </label>
            )}

            <div className="relative flex items-center">
                <select
                    id={name}
                    name={name}
                    value={value}
                    className={`
                        w-full appearance-none outline-none transition-all
                        border rounded-2xl bg-[var(--bg-main)]
                        text-[var(--text-heading)] font-medium
                        ${selectClassName} 
                        ${error ? 'border-rose-500' : 'border-[var(--border-color)] focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10'}
                    `}
                    {...rest}
                >
                    {options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>

                {/* The "No-Kissing" Chevron: Positioned 1.25rem from right */}
                <div className="absolute right-5 pointer-events-none text-[var(--text-main)] opacity-40">
                    <ChevronDown size={18} />
                </div>
            </div>
        </div>
    );
};