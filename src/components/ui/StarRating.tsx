// File: src/components/ui/StarRating.tsx
// Read-only row of five stars, `value` of them filled. Used for passage
// difficulty (1 = easy, 5 = difficult).
import { Star } from 'lucide-react'

export function StarRating({ value, label, size = 22 }: { value: number; label: string; size?: number }) {
    return (
        <span role="img" aria-label={label} className="inline-flex items-center gap-0.5">
            {Array.from({ length: 5 }, (_, i) => (
                <Star
                    key={i}
                    size={size}
                    strokeWidth={2}
                    className={
                        i < value
                            ? 'fill-amber-400 text-amber-500 dark:fill-amber-300 dark:text-amber-300'
                            : 'fill-transparent text-gray-300 dark:text-gray-600'
                    }
                />
            ))}
        </span>
    )
}
