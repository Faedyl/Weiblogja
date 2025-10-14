import Link from 'next/link'
import Image from 'next/image'
import { Calendar, User, Eye } from 'lucide-react'
import styles from './blogcard.module.css'
import { BlogPost } from '@/lib/dynamodb'

interface BlogCardProps {
	blog: BlogPost
}

export default function BlogCard({ blog }: BlogCardProps) {
	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		})
	}

	const getContentPreview = (content: string, maxLength: number = 150) => {
		if (content.length <= maxLength) return content
		return content.substring(0, maxLength).trim() + '...'
	}

	return (
		<Link href={`/blog/${blog.slug}`} className={styles.blogCardLink}>
			<article className={styles.blogCard}>

				<div className={styles.cardContent}>
					<div className={styles.cardHeader}>
						<div className={styles.metaItem}>
							<User size={16} />
							<span>{blog.author_id}</span>
						</div>

						<h3 className={styles.title}>
							{blog.title}
						</h3>
						{blog.ai_generated && (
							<span className={styles.aiTag}>AI Generated</span>
						)}
					</div>
					{/* Thumbnail - positioned absolutely */}
					{blog.thumbnail_url && (
						<div className={styles.thumbnailContainer}>
							<Image
								src={blog.thumbnail_url}
								alt={`${blog.title} thumbnail`}
								width={120}
								height={80}
								className={styles.thumbnail}
							/>
						</div>
					)}


					<div className={styles.metadata}>
						<div className={styles.metaItem}>
							<Calendar size={16} />
							<span>{formatDate(blog.created_at)}</span>
						</div>
						<div className={styles.metaItem}>
							<Eye size={16} />
							<span>{blog.views} views</span>
						</div>
					</div>

					<p className={styles.preview}>
						{getContentPreview(blog.content)}
					</p>

					{blog.category && (
						<div className={styles.category}>
							<span className={styles.categoryTag}>{blog.category}</span>
						</div>
					)}

					<div className={styles.cardFooter}>

					</div>
				</div>
			</article>
		</Link>
	)
}
