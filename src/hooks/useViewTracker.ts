'use client'

import { useEffect, useRef } from 'react'
import { logger } from '@/lib/logger'
export function useViewTracker(slug: string) {
        const hasTracked = useRef(false)

        useEffect(() => {
                if (hasTracked.current) return

                const trackView = async () => {
                        try {
                                await fetch(`/api/blogs/${slug}/views`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' }
                                })
                                hasTracked.current = true
                        } catch (error) {
                                logger.error('Failed to track view:', error)
                        }
                }

                const timer = setTimeout(trackView, 3000)
                return () => clearTimeout(timer)
        }, [slug])
}
