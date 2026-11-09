import { useId, type CSSProperties } from 'react'
import { useTheme } from '../../contexts/ThemeContext'
import { celestialPositions, landscapePalette } from './hillsideTransition'
import './HillsideBackdrop.css'

// Shared geometry keeps the landscape continuous when switching themes.
const RIDGES = [
    'M0 641 Q55 621 78 615 C110 604 140 630 178 615 L248 584 Q267 575 282 579 L326 566 Q341 559 355 569 C405 600 460 640 497 645 Q514 648 540 641 Q552 637 572 647 C633 676 665 684 710 685 Q772 705 839 718 C923 694 1003 652 1065 650 Q1078 652 1095 638 L1126 620 Q1142 611 1158 618 C1205 634 1253 647 1291 648 Q1305 649 1325 636 L1413 583 Q1430 574 1448 580 L1541 609 Q1567 619 1592 609 Q1605 603 1625 612 L1672 627 V941 H0Z',
    'M0 720 C129 711 239 663 330 670 C408 670 478 715 549 728 C598 734 626 723 667 733 L790 765 Q812 771 841 764 C950 734 1000 703 1082 714 L1172 725 C1262 699 1368 661 1437 663 C1510 666 1580 705 1672 697 V941 H0Z',
    'M0 784 C235 760 404 851 624 837 C786 824 904 785 1024 798 C1195 810 1398 863 1672 793 V941 H0Z',
    'M0 719 C226 731 392 781 565 812 C725 843 861 848 1035 880 L1235 941 H0Z',
    'M1672 716 C1472 739 1285 780 1125 818 C1009 843 916 868 782 892 L654 941 H1672Z',
    'M0 882 C186 864 354 848 490 864 C634 880 740 902 839 914 C983 890 1128 858 1268 873 C1426 884 1537 915 1672 883 V941 H0Z',
]
const DISTANT_TREES = [
    [124,735,0.43],[162,735,0.57],[210,741,0.6],[233,747,0.36],[250,753,0.52],[269,759,0.31],[295,765,0.42],
    [453,789,0.23],[471,792,0.34],[502,801,0.43],[522,806,0.58],[548,810,0.27],[574,817,0.51],[610,825,0.38],
    [1203,804,0.46],[1238,789,0.43],[1272,785,0.52],[1297,778,0.34],[1330,771,0.51],[1367,768,0.24],
    [1495,747,0.22],[1527,740,0.49],[1568,732,0.51],[1605,722,0.58],[1648,719,0.72],
]
const FRONT_TREES = [[-15,869,1.1],[51,866,1.65],[125,873,1.37],[186,884,1.05],[263,886,0.86],[1379,923,1.07],[1451,919,1.24],[1566,900,1.04],[1627,893,1.64],[1690,899,1.1]]
const STARS = Array.from({ length: 38 }, (_, i) => ({
    x: (i * 317 + 64) % 1650,
    y: (i * 139 + 34) % 510,
    radius: i % 7 === 0 ? 5 : i % 3 === 0 ? 1.5 : 0.9,
}))
// Initial positions mirror the reference. Each cloud wraps only while fully offscreen.
const CLOUDS = [
    { x: -70, y: 50, scale: 1.2, duration: 160 },
    { x: 280, y: 227, scale: 0.53, duration: 210 },
    { x: 1120, y: 124, scale: 0.67, duration: 185 },
    { x: 1390, y: 226, scale: 1.25, duration: 240 },
]
const CLOUD_PATH = 'M0 102 C0 92 23 86 40 87 C48 67 69 60 91 69 C107 27 137 5 172 5 C209 5 238 26 243 49 C269 43 289 55 295 74 C318 63 342 72 349 91 C379 88 398 99 396 107 C394 121 318 117 293 115 C263 126 225 123 200 117 C140 129 57 127 15 121 C3 119 -4 113 0 102Z'

function PineTree({ x, y, scale }: { x: number; y: number; scale: number }) {
    return <g transform={`translate(${x} ${y}) scale(${scale})`}>
        <path d="M-4 4 L-3 -24 C-16 -20 -29 -22 -32 -28 Q-20 -38 -15 -48 C-29 -43 -31 -50 -26 -54 Q-14 -66 -10 -76 C-22 -72 -22 -79 -17 -83 Q-7 -94 -3 -111 Q0 -118 3 -111 Q7 -94 17 -83 C22 -79 22 -72 10 -76 Q14 -66 26 -54 C31 -50 29 -43 15 -48 Q20 -38 32 -28 C29 -22 16 -20 3 -24 L4 4Z" />
    </g>
}

export function HillsideBackdrop({ className = '' }: { className?: string }) {
    const id = useId().replace(/:/g, '')
    const { skyProgress, reducedMotion } = useTheme()
    const positions = celestialPositions(skyProgress)
    if (reducedMotion) {
        positions.sun = { x: 88.3, y: 14 }
        positions.moon = { x: 88.3, y: 14 }
    }
    const stars = celestialPositions(skyProgress).stars
    const fill = (name: string) => `url(#${id}-${name})`
    return <div className={`hillside-backdrop pointer-events-none fixed inset-0 h-screen w-screen ${className}`} style={landscapePalette(skyProgress) as CSSProperties} aria-hidden="true">
        <svg className="hillside-layer" viewBox="0 0 1672 941" preserveAspectRatio="xMidYMid slice">
            <defs>
                <linearGradient id={`${id}-sky`} x2="0" y2="1">
                    <stop stopColor="var(--hill-sky-top)" />
                    <stop offset="0.55" stopColor="var(--hill-sky-mid)" />
                    <stop offset="1" stopColor="var(--hill-sky-bottom)" />
                </linearGradient>
                <radialGradient id={`${id}-horizon`} cx="50%" cy="100%" r="75%">
                    <stop stopColor="var(--hill-horizon)" stopOpacity="0.5" />
                    <stop offset="1" stopColor="var(--hill-horizon)" stopOpacity="0" />
                </radialGradient>
                <linearGradient id={`${id}-cloud`} x2="0.3" y2="1">
                    <stop stopColor="var(--hill-cloud-top)" />
                    <stop offset="1" stopColor="var(--hill-cloud-bottom)" />
                </linearGradient>
                {RIDGES.map((_, i) => <linearGradient key={i} id={`${id}-ridge-${i}`} x2="0.65" y2="1">
                    <stop stopColor={`var(--hill-ridge-${i})`} />
                    <stop offset="1" stopColor={`var(--hill-ridge-${i}-shade)`} />
                </linearGradient>)}
            </defs>
            <path d="M0 0H1672V941H0Z" fill={fill('sky')} />
            <path d="M0 0H1672V941H0Z" fill={fill('horizon')} />
            <g className="hillside-stars" style={{ opacity: stars }} fill="#ffe7a0">
                {STARS.map((star, i) => <g key={i} transform={`translate(${star.x} ${star.y})`}>
                    <g className="hillside-star" style={{ animationDelay: `${-i * 0.73}s`, animationDuration: `${3 + i % 5}s` }}>
                        {star.radius > 2 ? <path d="M0 -7 Q1 -1 7 0 Q1 1 0 7 Q-1 1 -7 0 Q-1 -1 0 -7Z" /> : <circle r={star.radius} />}
                    </g>
                </g>)}
            </g>
        </svg>
        <svg className="hillside-orb" viewBox="0 0 180 180" style={{ left: `${positions.sun.x}%`, top: `${positions.sun.y}%`, opacity: reducedMotion ? 1 - skyProgress : 1 }}>
            <defs><filter id={`${id}-sun-glow`} x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="15" /></filter></defs>
            <circle className="hillside-halo" cx="90" cy="90" r="72" fill="#fff3a0" opacity="0.6" filter={fill('sun-glow')} />
            <circle cx="90" cy="90" r="62" fill="#fff5ac" />
        </svg>
        <svg className="hillside-orb" viewBox="0 0 180 180" style={{ left: `${positions.moon.x}%`, top: `${positions.moon.y}%`, opacity: reducedMotion ? skyProgress : 1 }}>
            <defs>
                <filter id={`${id}-glow`} x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="15" /></filter>
                <linearGradient id={`${id}-moon`} x2="0.6" y2="1"><stop stopColor="#ffec9c" /><stop offset="1" stopColor="#ffdf79" /></linearGradient>
            </defs>
            <path className="hillside-halo" d="M95 23 A62 62 0 1 1 32 107 A57 57 0 0 0 95 23Z" fill="#ffe08b" opacity="0.65" filter={fill('glow')} />
            <path d="M95 23 A62 62 0 1 1 32 107 A57 57 0 0 0 95 23Z" fill={fill('moon')} />
        </svg>
        <svg className="hillside-layer" viewBox="0 0 1672 941" preserveAspectRatio="xMidYMid slice">
            {/* Expand the ground upward, anchored at the bottom of the scene. */}
            <g transform="translate(0 -282.3) scale(1 1.3)">
                {/* Low cloud banks stay behind the mountains. */}
                <g fill={fill('cloud')} opacity="0.85">
                    <g className="hillside-bank"><path d={CLOUD_PATH} transform="translate(-160 472) scale(1.2)" /><path d={CLOUD_PATH} transform="translate(425 596) scale(.8)" /></g>
                    <g className="hillside-bank hillside-bank-right"><path d={CLOUD_PATH} transform="translate(1390 502) scale(1.2)" /><path d={CLOUD_PATH} transform="translate(1280 607) scale(.65)" /></g>
                </g>
                {RIDGES.map((path, i) => <g key={i}>
                    {i === 3 && <g fill="var(--hill-tree-distant)">{DISTANT_TREES.map(([x,y,scale], j) => <PineTree key={j} x={x} y={y} scale={scale} />)}</g>}
                    <path d={path} fill={fill(`ridge-${i}`)} />
                </g>)}
                <g fill="var(--hill-tree-front)">{FRONT_TREES.map(([x,y,scale], i) => <PineTree key={i} x={x} y={y} scale={scale} />)}</g>
                <path fill="var(--hill-brush-back)" d="M0 843 Q18 831 43 852 Q77 835 101 863 Q123 853 143 876 L160 941 H0Z M1500 941 L1510 891 Q1534 875 1556 885 Q1587 852 1611 865 Q1636 847 1672 864 V941Z" />
                <path fill="var(--hill-brush-front)" d="M0 875 Q12 863 24 875 Q44 853 67 875 Q80 883 78 895 Q101 883 110 913 Q126 904 142 914 Q153 881 181 889 Q197 891 205 904 Q237 888 252 921 Q267 911 285 924 Q317 882 345 908 Q352 912 357 925 Q386 911 403 933 Q427 924 438 941 H0Z M1174 941 Q1187 910 1218 920 Q1234 883 1265 901 Q1284 906 1289 918 Q1311 905 1335 926 Q1363 918 1380 941Z M1505 941 Q1515 912 1543 923 Q1550 892 1580 900 Q1604 869 1634 895 Q1646 900 1650 911 Q1660 903 1672 913 V941Z" />
            </g>
        </svg>
        <svg className="hillside-layer hillside-cloud-layer" viewBox="0 0 1672 941" preserveAspectRatio="xMidYMid slice">
            <defs><linearGradient id={`${id}-moving-cloud`} x2="0.3" y2="1"><stop stopColor="var(--hill-cloud-top)" /><stop offset="1" stopColor="var(--hill-cloud-bottom)" /></linearGradient></defs>
            {CLOUDS.map((cloud, i) => <g key={i} className="hillside-cloud" style={{ animationDuration: `${cloud.duration}s`, animationDelay: `${-(cloud.x + 540) / 2780 * cloud.duration}s` }}>
                <path d={CLOUD_PATH} transform={`translate(-540 ${cloud.y}) scale(${cloud.scale})`} fill={fill('moving-cloud')} />
            </g>)}
        </svg>
    </div>
}
export default HillsideBackdrop
