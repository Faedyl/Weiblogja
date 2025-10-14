import { getBlogBySlug } from '@/lib/dynamodb'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import { Calendar, User, Eye } from 'lucide-react'
import Link from 'next/link'
import styles from './blog.module.css'

interface BlogPageProps {
	params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: BlogPageProps): Promise<Metadata> {
	const { slug } = await params
	const blog = await getBlogBySlug(slug)

	if (!blog) {
		return {
			title: 'Blog Not Found | Weiblogja',
			description: 'The requested blog post could not be found.'
		}
	}

	return {
		title: `${blog.title} | Weiblogja`,
		description: blog.content.substring(0, 160),
		keywords: [blog.category || 'blog', 'weiblogja', 'faedyl', blog.ai_generated ? 'ai-generated' : 'human-written'],
		authors: [{ name: blog.author_id }],
		openGraph: {
			title: blog.title,
			description: blog.content.substring(0, 160),
			type: 'article',
			authors: [blog.author_id],
			publishedTime: blog.created_at,
			modifiedTime: blog.updated_at
		},
		twitter: {
			card: 'summary_large_image',
			title: blog.title,
			description: blog.content.substring(0, 160)
		}
	}
}

export default async function BlogPage({ params }: BlogPageProps) {
	const { slug } = await params
	const blog = await getBlogBySlug(slug)

	if (!blog) {
		notFound()
	}

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		})
	}

	const serverTimestamp = "2025-10-14 03:18:08"

	return (
		<div className={styles.container}>

			<Link href="/" className={styles.backLink}>
				← Back to Home
			</Link>

			<article className={styles.article}>
				<header className={styles.header}>
					<h1 className={styles.title}>{blog.title}</h1>

					<div className={styles.metadata}>
						<div className={styles.metaItem}>
							<User size={18} />
							<span>{blog.author_id}</span>
						</div>
						<div className={styles.metaItem}>
							<Calendar size={18} />
							<span>{formatDate(blog.created_at)}</span>
						</div>
						<div className={styles.metaItem}>
							<Eye size={18} />
							<span>{blog.views} views</span>
						</div>
					</div>

					{blog.category && (
						<div className={styles.category}>
							<span className={styles.categoryTag}>{blog.category}</span>
						</div>
					)}

					{blog.ai_generated && (
						<div className={styles.aiTag}>
							🤖 AI Generated Content
						</div>
					)}
				</header>

				<div className={styles.content}>
					<p>{blog.content}</p>
				</div>

				<footer className={styles.footer}>
					<div className={styles.footerMeta}>
						<p>Published by <strong>{blog.author_id}</strong> on {formatDate(blog.created_at)}</p>
						{blog.updated_at !== blog.created_at && (
							<p>Last updated: {formatDate(blog.updated_at)}</p>
						)}
					</div>
				</footer>
			</article>
		</div>
	)
}
