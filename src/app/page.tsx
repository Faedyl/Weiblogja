import { getRecentBlogs } from '@/lib/dynamodb'
import InfiniteScroll from './components/InfiniteScroll/InfiniteScroll'
import styles from './page.module.css'
import { Metadata } from 'next'

export const metadata: Metadata = {
	title: 'Weiblogja - AI-Powered Blog Platform',
	description: 'Discover the latest blog posts powered by AI and human creativity. Read about technology, innovation, and insights.',
	keywords: ['blog', 'AI', 'technology', 'writing', 'content'],
	openGraph: {
		title: 'Weiblogja - AI-Powered Blog Platform',
		description: 'Discover the latest blog posts powered by AI and human creativity.',
		type: 'website'
	}
}

export default async function Home() {
	const recentBlogs = await getRecentBlogs(6)

	return (
		<div className={styles.DivContainer}>
			{/* Recent Blogs Section */}
			<section className={styles.recentBlogs}>
				<div className={styles.sectionHeader}>
					<h2 className={styles.sectionTitle}>Recent Blog Posts</h2>
					<p className={styles.sectionSubtitle}>
						Stay up to date with our latest content
					</p>
				</div>

				{recentBlogs.length > 0 ? (
					<InfiniteScroll initialBlogs={recentBlogs} />
				) : (
					<div className={styles.emptyState}>
						<div className={styles.emptyStateContent}>
							<h3>No blog posts yet</h3>
							<p>Check back soon for new content!</p>
						</div>
					</div>
				)}
			</section>
		</div>
	)
}
