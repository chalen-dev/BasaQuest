import React, { useState, useEffect, useRef } from 'react';

export interface SearchableSelectProps<T> {
    items: T[];
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSelect: (item: T) => void;
    selectedItem: T | null;
    getItemLabel: (item: T) => string;
    getItemValue: (item: T) => string | number;
    renderItem?: (item: T) => React.ReactNode;
    filterFn?: (item: T, searchTerm: string) => boolean;
    error?: string;
    required?: boolean;
    label?: string;
    name?: string;
    id?: string;
    placeholder?: string;
    disabled?: boolean;
    loading?: boolean;
    className?: string;           // container margin
    inputClassName?: string;       // input padding
}

export function SearchableSelect<T>({
                                        items,
                                        value,
                                        onChange,
                                        onSelect,
                                        selectedItem,
                                        getItemLabel,
                                        getItemValue,
                                        renderItem,
                                        filterFn,
                                        error,
                                        required,
                                        label,
                                        name = 'searchable_select',
                                        id,
                                        placeholder = 'Search...',
                                        disabled = false,
                                        loading = false,
                                        className = '',
                                        inputClassName = 'px-3 py-2',
                                    }: SearchableSelectProps<T>) {
    const [showDropdown, setShowDropdown] = useState(false);
    const [filteredItems, setFilteredItems] = useState<T[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputId = id || name;

    // Filter items when search term changes
    useEffect(() => {
        if (!value.trim()) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setFilteredItems([]);
            return;
        }
        const lower = value.toLowerCase();
        const filtered = items.filter(item => {
            if (filterFn) {
                return filterFn(item, lower);
            }
            return getItemLabel(item).toLowerCase().includes(lower);
        });
        setFilteredItems(filtered);
    }, [value, items, filterFn, getItemLabel]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e);
        setShowDropdown(true);
    };

    const handleItemClick = (item: T) => {
        onSelect(item);
        setShowDropdown(false);
    };

    const defaultRenderItem = (item: T) => (
        <div className="font-medium">{getItemLabel(item)}</div>
    );

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            {label && (
                <label htmlFor={inputId} className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}
            <input
                type="text"
                id={inputId}
                name={name}
                value={value}
                onChange={handleInputChange}
                onFocus={() => setShowDropdown(true)}
                placeholder={placeholder}
                disabled={disabled || loading}
                className={`w-full ${inputClassName} bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border rounded outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-gray-100 dark:disabled:bg-gray-800/50 disabled:cursor-not-allowed ${
                    error ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-700'
                }`}
                aria-invalid={!!error}
                aria-describedby={error ? `${inputId}-error` : undefined}
            />
            {error && (
                <p id={`${inputId}-error`} className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {error}
                </p>
            )}

            {selectedItem && !showDropdown && (
                <p className="mt-1 text-sm text-green-600 dark:text-green-400">
                    Selected: {getItemLabel(selectedItem)}
                </p>
            )}

            {showDropdown && (
                <div className="absolute z-10 w-full mt-1 max-h-60 overflow-auto bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg">
                    {loading && (
                        <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                            Loading...
                        </div>
                    )}
                    {!loading && filteredItems.length === 0 && value && (
                        <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                            No items found
                        </div>
                    )}
                    {!loading && filteredItems.map(item => (
                        <li
                            key={getItemValue(item)}
                            onClick={() => handleItemClick(item)}
                            className="px-4 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100 list-none"
                        >
                            {renderItem ? renderItem(item) : defaultRenderItem(item)}
                        </li>
                    ))}
                </div>
            )}
        </div>
    );
}