import Image from 'next/image'
import { BlogPost } from '@/lib/dynamodb'
import styles from './blogContent.module.css'

interface BlogContentProps {
	blog: BlogPost
}

export default function BlogContent({ blog }: BlogContentProps) {
	// Parse content and insert images at specified positions
	const renderContentWithImages = () => {
		if (!blog.images || blog.images.length === 0) {
			return <p>{blog.content}</p>
		}

		// Split content into paragraphs
		const paragraphs = blog.content.split('\n\n')
		const sortedImages = [...blog.images].sort((a, b) => a.position - b.position)
		const content: React.ReactNode[] = [];
		let imageIndex = 0

		paragraphs.forEach((paragraph, index) => {
			// Add paragraph
			content.push(
				<p key={`paragraph-${index}`} className={styles.paragraph}>
					{paragraph}
				</p>
			)

			// Insert image if position matches
			if (imageIndex < sortedImages.length &&
				sortedImages[imageIndex].position === index + 1) {
				const image = sortedImages[imageIndex]
				content.push(
					<div key={`image-${imageIndex}`} className={styles.imageContainer}>
						<Image
							src={image.url}
							alt={image.alt}
							width={800}
							height={400}
							className={styles.contentImage}
						/>
						{image.caption && (
							<p className={styles.imageCaption}>{image.caption}</p>
						)}
					</div>
				)
				imageIndex++
			}
		})

		return content
	}

	return (
		<div className={styles.content}>
			{renderContentWithImages()}
		</div>
	)
}
