'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { BlogPost } from '@/lib/dynamodb'
import ImagePreview from '@/app/components/ImagePreview/ImagePreview'
import styles from './blogContent.module.css'

interface BlogContentProps {
	blog: BlogPost
}

export default function BlogContent({ blog }: BlogContentProps) {
	const contentRef = useRef<HTMLDivElement>(null)
	const [modalImage, setModalImage] = useState<string | null>(null)
	
	// Check if content is HTML (AI-generated) or plain text
	const isHtmlContent = blog.ai_generated || blog.content.includes('<');

	// Add click handlers to blog-image elements
	useEffect(() => {
		if (!contentRef.current || !isHtmlContent) return

		const handleImageClick = (e: Event) => {
			const target = e.target as HTMLElement
			if (target.tagName === 'IMG' && target.classList.contains('blog-image')) {
				setModalImage((target as HTMLImageElement).src)
			}
		}

		const content = contentRef.current
		content.addEventListener('click', handleImageClick)

		return () => {
			content.removeEventListener('click', handleImageClick)
		}
	}, [isHtmlContent])

	const closeModal = () => setModalImage(null)

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
								<ImagePreview
									src={image.url}
									alt={image.alt}
									width={600}
									height={400}
									className={styles.contentImage}
									caption={image.caption}
									sizes="(max-width: 480px) 100vw, (max-width: 768px) 90vw, 600px"
								/>
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
						<ImagePreview
							src={image.url}
							alt={image.alt}
							width={600}
							height={400}
							className={styles.contentImage}
							caption={image.caption}
							sizes="(max-width: 480px) 100vw, (max-width: 768px) 90vw, 600px"
						/>
					</div>
				)
				imageIndex++
			}
		})

		return content
	}

	return (
		<>
			<div className={styles.content} ref={contentRef}>
				{renderContentWithImages()}
			</div>

			{modalImage && (
				<div className={styles.imageModal} onClick={closeModal}>
					<div className={styles.imageModalContent} onClick={(e) => e.stopPropagation()}>
						<button
							onClick={closeModal}
							className={styles.imageModalClose}
							title="Close preview"
						>
							<X size={24} />
						</button>
						<div className={styles.imageModalContainer}>
							<img
								src={modalImage}
								alt="Full size"
								className={styles.imageModalImage}
							/>
						</div>
					</div>
				</div>
			)}
		</>
	)
}
