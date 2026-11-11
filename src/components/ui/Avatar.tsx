// File: src/components/ui/Avatar.tsx
//
// A round profile picture. Shows the person's photo when they have one, else
// the first letter of their name on the orange disc the top bar always used.
import { useState } from 'react'

type AvatarProps = {
    url?: string | null
    name: string
    // Pixel size of the disc; the letter scales with it.
    size?: number
    className?: string
}

export function Avatar({ url, name, size = 36, className = '' }: AvatarProps) {
    // Remember which address failed, so a new url gets a fresh try.
    const [failedUrl, setFailedUrl] = useState<string | null>(null)
    const showPhoto = !!url && failedUrl !== url
    return (
        <div
            style={{ width: size, height: size, fontSize: Math.round(size * 0.45) }}
            className={`flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-orange-500 font-bold text-white ${className}`}
        >
            {showPhoto ? (
                <img src={url!} alt="" className="h-full w-full object-cover" onError={() => setFailedUrl(url!)} />
            ) : (
                name[0]?.toUpperCase()
            )}
        </div>
    )
}
