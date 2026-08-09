import React from 'react';
import { Search } from 'lucide-react';
import { Text } from './Text';

interface SearchInputProps {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
    label?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
                                                            value,
                                                            onChange,
                                                            placeholder = "Search...",
                                                            label = "Search"
                                                        }) => {
    return (
        <div className="relative w-full">
            <Search
                size={18}
                className="absolute left-4 bottom-[18px] z-10 opacity-30 pointer-events-none"
            />
            <Text
                name="search"
                label={label}
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                inputClassName="w-full pl-12 pr-4 py-4 rounded-2xl bg-[var(--bg-main)] border-[var(--border-color)] focus:ring-brand-500/20"
            />
        </div>
    );
};