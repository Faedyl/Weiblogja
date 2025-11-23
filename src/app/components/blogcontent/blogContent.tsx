import Image from 'next/image'
import { BlogPost } from '@/lib/dynamodb'
import styles from './blogContent.module.css'

interface BlogContentProps {
	blog: BlogPost
}

export default function BlogContent({ blog }: BlogContentProps) {
	// Check if content is HTML (AI-generated) or plain text
	const isHtmlContent = blog.ai_generated || blog.content.includes('<');

	// Parse content and insert images at specified positions
	const renderContentWithImages = () => {
		// For AI-generated HTML content, render directly with dangerouslySetInnerHTML
		if (isHtmlContent) {
			// If there are images, we need to insert them
			if (blog.images && blog.images.length > 0) {
				// TODO: Parse HTML and insert images at correct positions
				// For now, render HTML and images separately
				return (
					<>
						<div 
							dangerouslySetInnerHTML={{ __html: blog.content }}
							className={styles.htmlContent}
						/>
						{blog.images.filter(img => img.url && img.url.trim() !== '').map((image, index) => (
							<div key={`image-${index}`} className={styles.imageContainer}>
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
						))}
					</>
				)
			}

			// No images, just render HTML content
			return (
				<div 
					dangerouslySetInnerHTML={{ __html: blog.content }}
					className={styles.htmlContent}
				/>
			)
		}

		// For plain text content (non-AI), use the old method
		if (!blog.images || blog.images.length === 0) {
			return <p className={styles.paragraph}>{blog.content}</p>
		}

		// Split content into paragraphs and insert images
		const paragraphs = blog.content.split('\n\n')
		const sortedImages = [...blog.images].filter(img => img.url && img.url.trim() !== '').sort((a, b) => a.position - b.position)
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
