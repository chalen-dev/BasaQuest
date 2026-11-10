// File: src/pages/home/trackSceneImages.ts
export type TrackSceneName = 'history' | 'proficiency' | 'comprehension' | 'students' | 'storybuilder'

// Generated art in public/track-scenes/, each scene starring the owl.
export const SCENE_IMAGE: Record<TrackSceneName, string> = {
    history: '/track-scenes/owl-history.png',
    proficiency: '/track-scenes/owl-proficiency.png',
    comprehension: '/track-scenes/owl-comprehension.png',
    students: '/track-scenes/owl-student-dashboard.png',
    storybuilder: '/track-scenes/owl-story-builder.webp',
}
