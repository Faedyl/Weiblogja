'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import BlogCard from '../blogcard/blogcard'
import { BlogPost } from '@/lib/dynamodb'
import styles from './InfiniteScroll.module.css'

interface InfiniteScrollProps {
	initialBlogs: BlogPost[]
}

export default function InfiniteScroll({ initialBlogs }: InfiniteScrollProps) {
	const [blogs, setBlogs] = useState<BlogPost[]>(initialBlogs)
	const [page, setPage] = useState(1)
	const [loading, setLoading] = useState(false)
	const [hasMore, setHasMore] = useState(true)
	const observerTarget = useRef<HTMLDivElement>(null)

	const loadMoreBlogs = useCallback(async () => {
		if (loading || !hasMore) return

		setLoading(true)
		try {
			const response = await fetch(`/api/blogs/recent?page=${page + 1}&limit=6`)
			const data = await response.json()

			if (data.blogs && data.blogs.length > 0) {
				setBlogs(prev => [...prev, ...data.blogs])
				setPage(prev => prev + 1)
				setHasMore(data.pagination.hasMore)
			} else {
				setHasMore(false)
			}
		} catch (error) {
			console.error('Error loading more blogs:', error)
		} finally {
			setLoading(false)
		}
	}, [page, loading, hasMore])

	useEffect(() => {
		const observer = new IntersectionObserver(
			entries => {
				if (entries[0].isIntersecting && hasMore && !loading) {
					loadMoreBlogs()
				}
			},
			{ threshold: 0.1 }
		)

		const currentTarget = observerTarget.current
		if (currentTarget) {
			observer.observe(currentTarget)
		}

		return () => {
			if (currentTarget) {
				observer.unobserve(currentTarget)
			}
		}
	}, [loadMoreBlogs, hasMore, loading])

	return (
		<>
			<div className={styles.blogsGrid}>
				{blogs.map((blog) => (
					<BlogCard key={blog.PK} blog={blog} />
				))}
			</div>

			{/* Loading indicator */}
			{loading && (
				<div className={styles.loadingContainer}>
					<div className={styles.spinner}></div>
					<p>Loading more posts...</p>
				</div>
			)}

			{/* Intersection observer target */}
			<div ref={observerTarget} className={styles.observerTarget} />

			{/* End message */}
			{!hasMore && blogs.length > 0 && (
				<div className={styles.endMessage}>
					<p>You&apos;ve reached the end! 🎉</p>
				</div>
			)}
		</>
	)
}
