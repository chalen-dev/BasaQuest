import React from 'react'
import { OwlRig, type OwlEmotion } from './owlRig/OwlRig'

export type OwlMood =
    | 'neutral'
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
    /** Adds a gentle bounce (Tailwind's animate-bounce) to the owl. */
    bob?: boolean
    /** Adds a slow breathing/pulse loop — handy for loading/thinking states. */
    animated?: boolean
    className?: string
    /** Optional alt override; defaults to a mood-aware description. */
    alt?: string
    /** "full" is the whole bird; "icon" is the round portrait for avatars and badges. */
    variant?: 'full' | 'icon'
    /** Moves the beak as if the owl were speaking. */
    talking?: boolean
}

// The live owl (owlRig/) has the same ten emotions; "thinking" is its "listening".
const MOOD_EMOTION: Record<OwlMood, OwlEmotion> = {
    neutral: 'neutral',
    happy: 'happy',
    proud: 'proud',
    celebrating: 'celebrating',
    encouraging: 'encouraging',
    loading: 'loading',
    thinking: 'listening',
    confused: 'confused',
    sleepy: 'sleepy',
    surprised: 'surprised',
}

const MOOD_ALT: Record<OwlMood, string> = {
    neutral: 'BasaQuest owl mascot',
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
                                            mood = 'neutral',
                                            size = 64,
                                            bob = false,
                                            animated = false,
                                            className = '',
                                            alt,
                                            variant = 'full',
                                            talking = false,
                                        }) => {
    return (
        <OwlRig
            emotion={MOOD_EMOTION[mood]}
            variant={variant}
            size={size}
            talking={talking}
            label={alt ?? MOOD_ALT[mood]}
            className={`${bob ? 'animate-bounce' : ''} ${animated ? 'animate-owl-pulse' : ''} ${className}`}
        />
    )
}

export default Owl
