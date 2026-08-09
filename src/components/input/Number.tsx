import React from 'react';

interface NumberProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    name: string;
    value?: string | number;
    min?: number | string;
    max?: number | string;
    step?: number | string;
    error?: string;
    className?: string;          // container margin
    inputClassName?: string;      // input padding
}

export const Number: React.FC<NumberProps> = ({
                                                  label,
                                                  name,
                                                  value,
                                                  min,
                                                  max,
                                                  step,
                                                  error,
                                                  className = '',
                                                  inputClassName = 'px-3 py-2',
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
            <input
                type="number"
                id={inputId}
                name={name}
                value={value}
                min={min}
                max={max}
                step={step}
                className={`w-full ${inputClassName} bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border rounded outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-gray-100 dark:disabled:bg-gray-800/50 disabled:cursor-not-allowed ${
                    error
                        ? 'border-red-500 dark:border-red-400'
                        : 'border-gray-300 dark:border-gray-700'
                }`}
                aria-invalid={!!error}
                aria-describedby={error ? `${inputId}-error` : undefined}
                {...rest}
            />
            {error && (
                <p id={`${inputId}-error`} className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {error}
                </p>
            )}
        </div>
    );
};