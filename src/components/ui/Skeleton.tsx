// File: Skeleton.tsx
// File: src/components/ui/Skeleton.tsx
//
// Bare skeleton-loading primitive — a softly pulsing rounded block. Every
// page-specific skeleton (a list row, a passage card, a student-picker
// row, a route-loading shell, etc.) is built by composing these with
// widths/heights that mirror the real content about to appear, instead
// of a centered spinner/owl that gives no sense of shape or how much is
// coming. See components/routes/AuthRoutes.tsx,
// pages/students/review/ReviewList.tsx,
// pages/students/results/ResultsList.tsx,
// pages/proficiency/pre_assessment/select_student/ProficiencyAssessmentSelectStudent.tsx,
// pages/students/review/TeacherReviewAttempt.tsx,
// pages/students/results/AttemptResults.tsx, and
// pages/proficiency/pre_assessment/assessment_session/AssessmentSession.tsx
// for the compositions built on top of this.
//
// Colors deliberately match the app's existing muted-gray convention
// (bg-gray-900/10 light, bg-gray-100/10 dark) instead of a new palette —
// this should read as "the real content, temporarily gray," not as a
// different visual language bolted on top.
import React from 'react'
type SkeletonProps = {
    className?: string
}
export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => (
    <div className={`animate-pulse rounded-md bg-gray-900/10 dark:bg-gray-100/10 ${className}`} />
)
export default Skeleton