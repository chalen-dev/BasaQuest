import React from 'react'

export type OwlMood =
    | 'greeting'
    | 'happy'
    | 'proud'
    | 'loading'
    | 'celebrating'
    | 'encouraging'
    | 'thinking'
    | 'confused'
    | 'sleepy'
    | 'surprised'

interface OwlProps {
    mood?: OwlMood
    size?: number
    /** Adds a gentle bounce (Tailwind's animate-bounce) to the owl image. */
    bob?: boolean
    /** Adds a slow breathing/pulse loop — handy for loading/thinking states. */
    animated?: boolean
    className?: string
    /** Optional alt override; defaults to a mood-aware description. */
    alt?: string
}

const MOOD_IMAGE: Record<OwlMood, string> = {
    greeting: '/owl/2-owl-greeting.png',
    happy: '/owl/2-owl-greeting.png',
    proud: '/owl/3-owl-proud.png',
    celebrating: '/owl/4-owl-celebrating.png',
    encouraging: '/owl/5-owl-encouraging.png',
    loading: '/owl/6-owl-loading.png',
    thinking: '/owl/7-owl-listening.png',
    confused: '/owl/8-owl-confused.png',
    sleepy: '/owl/9-owl-sleepy.png',
    surprised: '/owl/10-owl-surprised.png',
}

const MOOD_ALT: Record<OwlMood, string> = {
    greeting: 'BasaQuest owl mascot waving hello',
    happy: 'BasaQuest owl mascot smiling happily',
    proud: 'BasaQuest owl mascot looking proud',
    celebrating: 'BasaQuest owl mascot celebrating',
    encouraging: 'BasaQuest owl mascot cheering you on',
    loading: 'BasaQuest owl mascot loading',
    thinking: 'BasaQuest owl mascot listening closely',
    confused: 'BasaQuest owl mascot looking confused',
    sleepy: 'BasaQuest owl mascot looking sleepy',
    surprised: 'BasaQuest owl mascot looking surprised',
}

/** Static neutral mark — not a mood, used for logo/branding spots. */
export const OWL_NEUTRAL_IMAGE = '/owl/1-owl-neutral.png'

export const Owl: React.FC<OwlProps> = ({
                                            mood = 'greeting',
                                            size = 64,
                                            bob = false,
                                            animated = false,
                                            className = '',
                                            alt,
                                        }) => {
    const src = MOOD_IMAGE[mood]
    const resolvedAlt = alt ?? MOOD_ALT[mood]

    return (
        <img
            src={src}
            alt={resolvedAlt}
            width={size}
            height={size}
            className={`select-none ${bob ? 'animate-bounce' : ''} ${animated ? 'animate-owl-pulse' : ''} ${className}`}
            draggable={false}
        />
    )
}

export default Owl