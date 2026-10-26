import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

type PasswordProps = {
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    id?: string;
    label?: string;
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    error?: string;
    className?: string;          // container margin
    inputClassName?: string;      // input padding
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>;

export const PasswordInput = ({
                             name,
                             value,
                             onChange,
                             id,
                             label = 'Password',
                             placeholder,
                             disabled,
                             required,
                             error,
                             className = '',
                             inputClassName = 'px-3 py-2 pr-10',
                             ...rest
                         }: PasswordProps) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputId = id || name;

    const togglePasswordVisibility = () => {
        setShowPassword((prev) => !prev);
    };

    return (
        <div className={className}>
            {label && (
                <label htmlFor={inputId} className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {label}
                </label>
            )}
            <div className="relative">
                <input
                    type={showPassword ? 'text' : 'password'}
                    id={inputId}
                    name={name}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    disabled={disabled}
                    required={required}
                    className={`w-full ${inputClassName} bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border rounded outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-gray-100 dark:disabled:bg-gray-800/50 disabled:cursor-not-allowed ${
                        error ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-700'
                    }`}
                    aria-invalid={!!error}
                    aria-describedby={error ? `${inputId}-error` : undefined}
                    {...rest}
                />
                <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    disabled={disabled}
                    className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                    {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                </button>
            </div>
            {error && (
                <p id={`${inputId}-error`} className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {error}
                </p>
            )}
        </div>
    );
};