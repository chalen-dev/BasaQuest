// File: src/pages/home/components/TrackScene.tsx
import React from 'react'

type SceneName = 'history' | 'proficiency' | 'comprehension' | 'students'

interface TrackSceneProps {
    name: SceneName
    className?: string
}

// Static illustrated scenes — generated art living in public/track-scenes/,
// each scene starring the BasaQuest owl. Previously these were hand-coded
// animated SVGs; replaced with static PNGs once real illustrated art was
// available. See git history for the old SVG version if the animated
// equalizer/idea-bubble/moon-glow treatment needs to be revisited.
const SCENE_IMAGE: Record<SceneName, string> = {
    history: '/track-scenes/owl-history.png',
    proficiency: '/track-scenes/owl-proficiency.png',
    comprehension: '/track-scenes/owl-comprehension.png',
    students: '/track-scenes/owl-student-dashboard.png',
}

export const TrackScene: React.FC<TrackSceneProps> = ({ name, className = '' }) => {
    return (
        <img
            src={SCENE_IMAGE[name]}
            alt=""
            aria-hidden="true"
            draggable={false}
            className={`select-none object-cover transition-transform duration-300 ease-out group-hover:scale-105 ${className}`}
        />
    )
}

export default TrackScene