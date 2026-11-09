// Day -> twilight -> night. Running the same timeline backward produces dawn.
const PALETTE = {
    'sky-top': ['#ffad80', '#443465', '#10163e'],
    'sky-mid': ['#ffd099', '#bd687f', '#232e70'],
    'sky-bottom': ['#ffe5a3', '#ffb077', '#5152ad'],
    'horizon': ['#fff0b1', '#ffcf8c', '#6860bc'],
    'cloud-top': ['#ffedca', '#d596a6', '#435da5'],
    'cloud-bottom': ['#ffe2b8', '#80658e', '#304487'],
    'ridge-0': ['#ffac78', '#a6759a', '#514fa2'],
    'ridge-0-shade': ['#ffc38e', '#b98396', '#454a9b'],
    'ridge-1': ['#ef945b', '#825c83', '#303b83'],
    'ridge-1-shade': ['#f7a16a', '#996789', '#3b4696'],
    'ridge-2': ['#ba8129', '#654466', '#1a3765'],
    'ridge-2-shade': ['#d49a30', '#794e70', '#24447e'],
    'ridge-3': ['#d99a23', '#54405b', '#122d52'],
    'ridge-3-shade': ['#efb936', '#704c68', '#1d3c70'],
    'ridge-4': ['#e6a62a', '#60445e', '#18365f'],
    'ridge-4-shade': ['#d79c23', '#493952', '#10284d'],
    'ridge-5': ['#a87816', '#342a45', '#0b2040'],
    'ridge-5-shade': ['#ba8a1b', '#46344f', '#122d52'],
    'tree-distant': ['#b18536', '#4a3654', '#0c2449'],
    'tree-front': ['#906414', '#29213a', '#05172e'],
    'brush-back': ['#aa7a1c', '#3c2c47', '#0b2343'],
    'brush-front': ['#916113', '#221c32', '#04152b'],
} as const

export function smoothStep(value: number) {
    const clamped = Math.max(0, Math.min(1, value))
    return clamped * clamped * (3 - 2 * clamped)
}

function mixColor(a: string, b: string, amount: number) {
    const channel = (color: string, offset: number) => parseInt(color.slice(offset, offset + 2), 16)
    return '#' + [1, 3, 5].map(offset => Math.round(channel(a, offset) + (channel(b, offset) - channel(a, offset)) * amount).toString(16).padStart(2, '0')).join('')
}

export function landscapePalette(progress: number): Record<string, string> {
    const half = progress < 0.5 ? 0 : 1
    const amount = smoothStep(half === 0 ? progress * 2 : (progress - 0.5) * 2)
    return Object.fromEntries(Object.entries(PALETTE).map(([key, colors]) => [
        `--hill-${key}`, mixColor(colors[half], colors[half + 1], amount),
    ]))
}

export function celestialPositions(progress: number) {
    const sunset = smoothStep(progress / 0.48)
    const moonrise = smoothStep((progress - 0.52) / 0.48)
    return {
        sun: { x: 88.3 - 68 * sunset, y: 14 - 14 * Math.sin(Math.PI * sunset) + 70 * sunset * sunset },
        moon: { x: 96 - 7.7 * moonrise - 15 * Math.sin(Math.PI * moonrise), y: 84 - 70 * Math.sin(moonrise * Math.PI / 2) },
        stars: smoothStep((progress - 0.48) / 0.52),
    }
}
