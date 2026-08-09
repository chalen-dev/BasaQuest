import React, { useRef, useState, useEffect } from 'react';

type Props = {
    name: string;
    onChange: (file: File | null) => void;
    currentImageUrl?: string | null;
    label?: string;
    accept?: string;
    disabled?: boolean;
    error?: string;
    className?: string;          // container margin
    buttonClassName?: string;     // button padding
    clearButtonClassName?: string;
};

export const ImageInput = ({
                               name,
                               onChange,
                               currentImageUrl,
                               label = 'Image',
                               accept = 'image/*',
                               disabled = false,
                               error,
                               className = '',
                               buttonClassName = 'px-4 py-2',
                               clearButtonClassName = 'px-4 py-2',
                           }: Props) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
    const objectUrlRef = useRef<string | null>(null);

    // Clean up object URL on unmount
    useEffect(() => {
        return () => {
            if (objectUrlRef.current) {
                URL.revokeObjectURL(objectUrlRef.current);
            }
        };
    }, []);

    // Sync with currentImageUrl prop
    useEffect(() => {
        if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
            objectUrlRef.current = null;
        }
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setPreview(currentImageUrl || null);
    }, [currentImageUrl]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        if (file) {
            if (objectUrlRef.current) {
                URL.revokeObjectURL(objectUrlRef.current);
            }
            const previewUrl = URL.createObjectURL(file);
            objectUrlRef.current = previewUrl;
            setPreview(previewUrl);
            onChange(file);
        } else {
            if (objectUrlRef.current) {
                URL.revokeObjectURL(objectUrlRef.current);
                objectUrlRef.current = null;
            }
            setPreview(currentImageUrl || null);
            onChange(null);
        }
    };

    const handleClear = () => {
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
            objectUrlRef.current = null;
        }
        setPreview(null);
        onChange(null);
    };

    const triggerFileInput = () => {
        if (!disabled) {
            fileInputRef.current?.click();
        }
    };

    return (
        <div className={className}>
            {label && (
                <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {label}
                </label>
            )}

            <div className="flex items-center gap-4">
                <input
                    type="file"
                    ref={fileInputRef}
                    name={name}
                    accept={accept}
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={disabled}
                />

                <button
                    type="button"
                    onClick={triggerFileInput}
                    disabled={disabled}
                    className={`${buttonClassName} bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
                >
                    <i className="fas fa-upload mr-2" />
                    Choose Image
                </button>

                {preview && (
                    <button
                        type="button"
                        onClick={handleClear}
                        disabled={disabled}
                        className={`${clearButtonClassName} bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 transition-colors`}
                    >
                        <i className="fas fa-times mr-2" />
                        Clear
                    </button>
                )}
            </div>

            {preview && (
                <div className="mt-4">
                    <div className="w-48 h-48 border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
                        <img
                            src={preview}
                            alt="Preview"
                            className="w-full h-full object-contain"
                        />
                    </div>
                </div>
            )}

            {error && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
        </div>
    );
};