'use client'

import { useEffect, useRef, useState } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { BlogPost } from '@/lib/dynamodb'
import ImagePreview from '@/app/components/ImagePreview/ImagePreview'
import styles from './blogContent.module.css'

interface BlogContentProps {
	blog: BlogPost
}

export default function BlogContent({ blog }: BlogContentProps) {
	const contentRef = useRef<HTMLDivElement>(null)
	const [modalImage, setModalImage] = useState<string | null>(null)
	const [currentImageIndex, setCurrentImageIndex] = useState<number>(0)
	const [allImages, setAllImages] = useState<Array<{url: string, alt: string, caption?: string}>>([])

	// Check if content is HTML (AI-generated) or plain text
	const isHtmlContent = blog.ai_generated || blog.content.includes('<');

	// Validate URL helper
	const isValidUrl = (url: string): boolean => {
		if (!url || url.trim() === '') return false
		// Check for placeholder patterns
		if (url.includes('{{') || url.includes('}}')) return false
		try {
			new URL(url)
			return true
		} catch {
			// Check if it's a valid relative path
			return url.startsWith('/') || url.startsWith('./') || url.startsWith('../')
		}
	}

	// Extract all images for lightbox navigation
	useEffect(() => {
		const images: Array<{url: string, alt: string, caption?: string}> = [];
		
		// Add images from blog.images array
		if (blog.images && blog.images.length > 0) {
			blog.images
				.filter(img => img.url && img.url.trim() !== '' && isValidUrl(img.url))
				.forEach(img => {
					images.push({
						url: img.url,
						alt: img.alt,
						caption: img.caption
					});
				});
		}
		
		// Also extract images from HTML content if present
		if (isHtmlContent && typeof document !== 'undefined') {
			const tempDiv = document.createElement('div');
			tempDiv.innerHTML = blog.content;
			const imgElements = tempDiv.querySelectorAll('img.blog-image');
			
			imgElements.forEach(img => {
				const src = img.getAttribute('src');
				const alt = img.getAttribute('alt') || 'Blog image';
				if (src && src.trim() !== '' && isValidUrl(src)) {
					images.push({
						url: src,
						alt: alt,
						caption: '' // Could potentially extract caption from surrounding elements
					});
				}
			});
		}
		
		setAllImages(images);
	}, [blog]);

	// Add click handlers to blog-image elements
	useEffect(() => {
		if (!contentRef.current || !isHtmlContent) return

		const handleImageClick = (e: Event) => {
			const target = e.target as HTMLElement
			if (target.tagName === 'IMG' && target.classList.contains('blog-image')) {
				const clickedSrc = (target as HTMLImageElement).src;
				setModalImage(clickedSrc);
				
				// Find the index of the clicked image
				const clickedIndex = allImages.findIndex(img => img.url === clickedSrc);
				if (clickedIndex >= 0) {
					setCurrentImageIndex(clickedIndex);
				}
			}
		}

		const content = contentRef.current
		content.addEventListener('click', handleImageClick)

		return () => {
			content.removeEventListener('click', handleImageClick)
		}
	}, [isHtmlContent, allImages])

	const closeModal = () => setModalImage(null)

	const goToPreviousImage = () => {
		setCurrentImageIndex(prev => prev === 0 ? allImages.length - 1 : prev - 1);
	}

	const goToNextImage = () => {
		setCurrentImageIndex(prev => prev === allImages.length - 1 ? 0 : prev + 1);
	}

	// Handle keyboard navigation in modal
	useEffect(() => {
		if (!modalImage) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				closeModal();
			} else if (e.key === 'ArrowLeft') {
				goToPreviousImage();
			} else if (e.key === 'ArrowRight') {
				goToNextImage();
			}
		};

		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [modalImage, currentImageIndex, allImages.length]);

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
									width={800}
									height={500}
									className={styles.contentImage}
									caption={image.caption}
									sizes="(max-width: 480px) 100vw, (max-width: 768px) 95vw, (max-width: 1024px) 800px, 800px"
									priority={index === 0} // Prioritize first image
									placeholder="blur"
									quality={85}
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
								width={800}
								height={500}
								className={styles.contentImage}
								caption={image.caption}
								sizes="(max-width: 480px) 100vw, (max-width: 768px) 95vw, (max-width: 1024px) 800px, 800px"
								priority={imageIndex === 0} // Prioritize first image
								placeholder="blur"
								quality={85}
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
				<div 
					className={styles.imageModal} 
					onClick={closeModal}
					role="dialog"
					aria-modal="true"
					aria-label="Image gallery"
				>
					<div className={styles.imageModalContent} onClick={(e) => e.stopPropagation()}>
						<button
							onClick={closeModal}
							className={styles.imageModalClose}
							title="Close gallery"
							aria-label="Close image gallery"
						>
							<X size={24} />
						</button>
						
						{/* Navigation buttons */}
						{allImages.length > 1 && (
							<>
								<button
									onClick={(e) => {
										e.stopPropagation();
										goToPreviousImage();
									}}
									className={`${styles.navButton} ${styles.prevButton}`}
									title="Previous image"
									aria-label="Previous image"
								>
									<ChevronLeft size={24} />
								</button>
								
								<button
									onClick={(e) => {
										e.stopPropagation();
										goToNextImage();
									}}
									className={`${styles.navButton} ${styles.nextButton}`}
									title="Next image"
									aria-label="Next image"
								>
									<ChevronRight size={24} />
								</button>
							</>
						)}
						
						<div className={styles.imageModalContainer}>
							<ImagePreview
								src={allImages[currentImageIndex]?.url || modalImage}
								alt={allImages[currentImageIndex]?.alt || "Blog image"}
								width={1200}
								height={800}
								className={styles.imageModalImage}
								quality={90}
								priority={true}
								placeholder="blur"
							/>
							
							{/* Caption for current image */}
							{allImages[currentImageIndex]?.caption && (
								<div className={styles.imageModalCaption}>
									{allImages[currentImageIndex].caption}
								</div>
							)}
							
							{/* Counter */}
							{allImages.length > 1 && (
								<div className={styles.imageCounter}>
									{currentImageIndex + 1} / {allImages.length}
								</div>
							)}
						</div>
					</div>
				</div>
			)}
		</>
	)
}