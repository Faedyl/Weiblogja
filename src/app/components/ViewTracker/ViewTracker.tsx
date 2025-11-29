'use client'

import { useViewTracker } from '@/hooks/useViewTracker'

interface ViewTrackerProps {
	slug: string
}

export default function ViewTracker({ slug }: ViewTrackerProps) {
	useViewTracker(slug)
	return null
}
