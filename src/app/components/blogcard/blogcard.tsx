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

	const stripHtmlTags = (html: string) => {
		return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
	}

	const getContentPreview = (content: string, maxLength: number = 150) => {
		const plainText = stripHtmlTags(content);
		if (plainText.length <= maxLength) return plainText;
		return plainText.substring(0, maxLength).trim() + '...';
	}

	const getSummary = () => {
		// Use AI-generated summary if available
		if (blog.summary) {
			return blog.summary.length > 200 
				? blog.summary.substring(0, 200).trim() + '...'
				: blog.summary;
		}
		// Fallback to content preview
		return getContentPreview(blog.content);
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
							<span className={styles.aiTag}>🤖 AI Generated</span>
						)}
					</div>
					{/* Thumbnail - positioned absolutely */}
					{blog.thumbnail_url && (
						<div className={styles.thumbnailContainer}>
							<Image
								src={blog.thumbnail_url}
								alt={`${blog.title} thumbnail`}
								fill
								sizes="(max-width: 570px) 100vw, 180px"
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
						{getSummary()}
					</p>

					{/* Show tags if available */}
					{blog.tags && blog.tags.length > 0 && (
						<div className={styles.tags}>
							{blog.tags.slice(0, 3).map((tag, index) => (
								<span key={index} className={styles.tag}>
									{tag}
								</span>
							))}
						</div>
					)}

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
