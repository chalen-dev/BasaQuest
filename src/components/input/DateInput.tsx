// File: src/components/input/DateInput.tsx
import React from 'react';
import { Text } from './Text';

interface DateProps {
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    id?: string;
    label?: string;
    disabled?: boolean;
    required?: boolean;
    error?: string;
    className?: string;
    inputClassName?: string;
    min?: string;
    max?: string;
    type?: 'date' | 'datetime-local';
}

export const DateInput: React.FC<DateProps> = ({
                                                   name,
                                                   value,
                                                   onChange,
                                                   id,
                                                   label = 'Date',
                                                   disabled,
                                                   required,
                                                   error,
                                                   className,
                                                   inputClassName = 'dark:[&::-webkit-calendar-picker-indicator]:invert',
                                                   min,
                                                   max,
                                                   type = 'date',
                                               }) => {
    return (
        <Text
            type={type}
            name={name}
            value={value}
            onChange={onChange}
            id={id}
            label={label}
            disabled={disabled}
            required={required}
            error={error}
            className={className}
            inputClassName={inputClassName}
            min={min}
            max={max}
        />
    );
};