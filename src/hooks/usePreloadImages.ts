// File: src/hooks/usePreloadImages.ts
// True once every image in `urls` has downloaded (or failed, or `maxMs` ran
// out), so a page can show a loading screen instead of pictures popping in one
// by one. The cap means one slow or broken image can never hold a page hostage.
// Finished URLs are remembered, so coming back to a page is instant.
import { useEffect, useState } from 'react'

const loaded = new Set<string>()

function load(url: string): Promise<void> {
    if (loaded.has(url)) return Promise.resolve()
    return new Promise((resolve) => {
        const img = new Image()
        const done = () => {
            loaded.add(url)
            resolve()
        }
        img.onload = done
        img.onerror = done
        img.src = url
        // A cached image can already be complete; decode() resolves either way.
        if (img.complete) done()
    })
}

export function usePreloadImages(urls: readonly string[], maxMs = 3000): boolean {
    const key = urls.join('|')
    const [doneKey, setDoneKey] = useState<string | null>(null)
    const allKnown = urls.every((u) => loaded.has(u))

    useEffect(() => {
        if (allKnown) return
        let cancelled = false
        const finish = () => {
            if (!cancelled) setDoneKey(key)
        }
        const timer = window.setTimeout(finish, maxMs)
        void Promise.all(urls.map(load)).then(finish)
        return () => {
            cancelled = true
            window.clearTimeout(timer)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key, maxMs, allKnown])

    return allKnown || doneKey === key
}
