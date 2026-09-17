// File: src/pages/students/remediation/coach/features/coachPageGeometry.ts
//
// Pure page-bend geometry for CoachTableBackdrop.tsx's page-turn
// animation — split out of that file (which was pushing 1100+ lines)
// so this rarely-touched math doesn't have to be re-pasted whenever a
// behavior/logic fix is needed elsewhere. Nothing in this file touches
// the DOM or React at all — it's pure numeric functions/data.
//
// Ported/re-derived from the "book tabletop" HTML/CSS/JS prototype's
// coefficients()/bentPath()/computePose() — see CoachTableBackdrop.tsx's
// own header comment for the full provenance note (what's verbatim vs.
// re-derived, and the one acknowledged inference — restLightOpacity
// below).

// ---------------------------------------------------------------------
// Page-bend geometry -- verbatim formulas from the prototype's
// coefficients()/bentPath()/computePose(), computed once at module load
// since #coach-pageShape never changes shape.
// ---------------------------------------------------------------------
type Pt = { x: number; y: number; wx: number; wy: number }
type Cmd = { cmd: 'M' | 'C' | 'L' | 'Z'; pts: Pt[] }

// The exact `d` of #coach-pageShape, hand-parsed once into commands
// (M/C/L/Z, all absolute) rather than through a generic path parser --
// there's only ever this one fixed shape, so a generic parser would be
// pure risk for zero benefit.
const PAGE_SHAPE_RAW: { cmd: Cmd['cmd']; pts: [number, number][] }[] = [
    { cmd: 'M', pts: [[904, 82]] },
    { cmd: 'C', pts: [[1136, 79], [1375, 62], [1511, 79]] },
    { cmd: 'C', pts: [[1555, 83], [1580, 88], [1594, 103]] },
    { cmd: 'L', pts: [[1594, 842]] },
    { cmd: 'C', pts: [[1589, 853], [1577, 849], [1561, 846]] },
    { cmd: 'C', pts: [[1506, 829], [1416, 834], [1327, 834]] },
    { cmd: 'L', pts: [[901, 837]] },
    { cmd: 'C', pts: [[881, 837], [870, 823], [870, 804]] },
    { cmd: 'L', pts: [[870, 113]] },
    { cmd: 'C', pts: [[870, 94], [884, 83], [904, 82]] },
    { cmd: 'Z', pts: [] },
]

// coefficients(x,y) -- exact formula from the prototype: u is how far a
// point is from the spine (x=1594, the binding) across the page's ~724px
// half-width; bow/wx/wy are the page-curl displacement at that point.
function coefficients(x: number, y: number): { wx: number; wy: number } {
    const u = (1594 - x) / 724
    const bow = Math.sin(Math.PI * u)
    const wx = -105 * bow
    const wy = (38 * u - 86 * bow) * (1 - 0.28 * (y - 103) / 739)
    return { wx, wy }
}

const PAGE_SHAPE_COMMANDS: Cmd[] = PAGE_SHAPE_RAW.map((c) => ({
    cmd: c.cmd,
    pts: c.pts.map(([x, y]) => {
        const { wx, wy } = coefficients(x, y)
        return { x, y, wx, wy }
    }),
}))

// bentPath(rotation, signedLift) -- rebuilds #coach-turn-geometry's `d`
// for the current animation parameter. Exact formula:
//   x' = 1594 + (x-1594)*rotation + signedLift*wx
//   y' = y + signedLift*wy
function bentPath(rotation: number, signedLift: number): string {
    const r2 = (n: number) => Math.round(n * 100) / 100
    return PAGE_SHAPE_COMMANDS.map((c) => {
        if (c.cmd === 'Z') return 'Z'
        const coords = c.pts
            .map((p) => {
                const x = 1594 + (p.x - 1594) * rotation + signedLift * p.wx
                const y = p.y + signedLift * p.wy
                return `${r2(x)} ${r2(y)}`
            })
            .join(' ')
        return `${c.cmd}${coords}`
    }).join(' ')
}

// ---------------------------------------------------------------------
// The 16 text-bend strips -- geometry-only data (DOM nodes are created
// lazily per component instance, in CoachTableBackdrop.tsx's
// prepareMovingStory). Exact constants/derivative formulas from the
// prototype's prepareMovingStory()/computePose():
//   step = (1520-936)/16, center = x + step/2, y = 330 (fixed)
//   da = d(wx)/dx, db = d(wy)/dx (numeric, +-0.1 step), dd = d(wy)/dy
//   (numeric, unit step -- no division since the step is exactly 1)
// ---------------------------------------------------------------------
export type SliceBase = { x: number; y: number; wx: number; wy: number; da: number; db: number; dd: number }

export const STRIP_COUNT = 16
export const STRIP_X0 = 936
const STRIP_X1 = 1520
export const STRIP_STEP = (STRIP_X1 - STRIP_X0) / STRIP_COUNT
export const STRIP_Y = 330

export const SLICE_BASES: SliceBase[] = Array.from({ length: STRIP_COUNT }, (_, index) => {
    const x = STRIP_X0 + index * STRIP_STEP
    const center = x + STRIP_STEP / 2
    const point = coefficients(center, STRIP_Y)
    const dx = coefficients(center + 0.1, STRIP_Y)
    const dy = coefficients(center, STRIP_Y + 1)
    return {
        x: center,
        y: STRIP_Y,
        wx: point.wx,
        wy: point.wy,
        da: (dx.wx - point.wx) / 0.1,
        db: (dx.wy - point.wy) / 0.1,
        dd: dy.wy - point.wy,
    }
})

export type StripPose = { matrix: string; opacity: string }

export type Pose = {
    d: string
    shadowX1: number
    shadowX2: number
    paperX2: number
    foldX1: number
    foldX2: number
    sheetLightOpacity: number
    restLightOpacity: number
    strips: StripPose[]
}

// computePose(t) -- t runs 1..2 across a turn (1.5 is the peak bend).
// Every formula here is verbatim from the prototype's computePose(),
// confirmed against its source line-by-line (see CoachTableBackdrop.tsx's
// header comment for which parts are exact vs. the one inferred
// exception, restLightOpacity below).
function computePose(t: number): Pose {
    const rotation = -Math.cos(Math.PI * t)
    const signedLift = Math.sin(Math.PI * t)
    const lift = Math.abs(signedLift)
    const outer = 1594 - 724 * rotation
    const fold = 1594 + (outer - 1594) * 0.7 - 65 * lift

    const strips: StripPose[] = SLICE_BASES.map((p) => {
        const a = rotation + signedLift * p.da
        const b = signedLift * p.db
        const d2 = 1 + signedLift * p.dd
        const px = 1594 + (p.x - 1594) * rotation + signedLift * p.wx
        const py = p.y + signedLift * p.wy
        const e = px - a * p.x
        const f = py - b * p.x - d2 * p.y
        return {
            matrix: `matrix(${a} ${b} 0 ${d2} ${e} ${f})`,
            opacity: a < 0 ? '.06' : '1',
        }
    })

    return {
        d: bentPath(rotation, signedLift),
        shadowX1: outer - 46,
        shadowX2: outer + 34,
        paperX2: Math.abs(outer - 1594) < 0.01 ? 1594.01 : outer,
        foldX1: fold - 90,
        foldX2: fold + 90,
        sheetLightOpacity: lift * 0.8,
        // INFERRED (see CoachTableBackdrop.tsx's header comment): the
        // prototype's rest-light opacity formula wasn't extractable
        // verbatim. Fading it out at the bend's peak and back in as the
        // sheet settles is the sensible reading of what "rest light"
        // means, but tune this if it looks off next to the confirmed
        // formulas above.
        restLightOpacity: 1 - lift,
        strips,
    }
}

// 241-entry pose cache (t = 1, 1 + 1/240, ..., 2), built once and shared
// module-wide -- matches the prototype's own pose-caching rationale
// exactly (pure geometry, independent of theme/content, so there's
// nothing instance-specific to recompute).
let poseCache: Pose[] | null = null
function getPoseCache(): Pose[] {
    if (!poseCache) {
        poseCache = []
        for (let i = 0; i <= 240; i++) {
            poseCache.push(computePose(1 + i / 240))
        }
    }
    return poseCache
}
export function poseAt(t: number): Pose {
    const cache = getPoseCache()
    const idx = Math.min(240, Math.max(0, Math.round((t - 1) * 240)))
    return cache[idx]
}

// Cubic smoothstep -- exact easing from the prototype turnPage()'s rAF
// loop.
export const smoothstep = (x: number) => x * x * (3 - 2 * x)