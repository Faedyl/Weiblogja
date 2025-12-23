'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { X, ZoomIn, AlertCircle } from 'lucide-react'
import styles from './ImagePreview.module.css'

interface ImagePreviewProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  caption?: string
  sizes?: string
  priority?: boolean
  quality?: number
  onLoad?: () => void
  onError?: () => void
  placeholder?: 'blur' | 'empty' | 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjMyMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2ZXJzaW9uPSIxLjEiLz4='
}

export default function ImagePreview({
  src,
  alt,
  width = 800,
  height = 400,
  className = '',
  caption,
  sizes = "(max-width: 480px) 100vw, (max-width: 768px) 100vw, 800px",
  priority = false,
  quality = 85,
  onLoad,
  onError,
  placeholder = 'blur'
}: ImagePreviewProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  // Validate URL
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

  const openPreview = () => setIsOpen(true)
  const closePreview = () => setIsOpen(false)

  // Handle keyboard events for accessibility
  useEffect(() => {
    if (isOpen) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          closePreview()
        }
      }
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const handleImageLoad = () => {
    setIsLoading(false)
    setImageLoaded(true)
    onLoad?.()
  }

  const handleImageError = () => {
    setIsLoading(false)
    setHasError(true)
    onError?.()
  }

  // Check if URL is invalid on mount
  const urlIsInvalid = !isValidUrl(src)

  return (
    <>
      <div
        className={`${styles.imageWrapper} ${hasError || urlIsInvalid ? styles.imageError : ''}`}
        onClick={urlIsInvalid ? undefined : openPreview}
        role="button"
        tabIndex={0}
        aria-label={`Preview image: ${alt}`}
        onKeyDown={(e) => {
          if (!urlIsInvalid && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            openPreview()
          }
        }}
      >
        {isLoading && !hasError && !urlIsInvalid && (
          <div className={styles.loadingOverlay}>
            <div className={styles.spinner}></div>
            <span>Loading image...</span>
          </div>
        )}

        {hasError || urlIsInvalid ? (
          <div className={styles.errorContainer}>
            <AlertCircle size={48} className={styles.errorIcon} />
            <p>{urlIsInvalid ? 'Invalid image URL' : 'Failed to load image'}</p>
            {!urlIsInvalid && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  window.open(src, '_blank')
                }}
                className={styles.retryButton}
              >
                View Original
              </button>
            )}
          </div>
        ) : (
          <Image
            src={src}
            alt={alt}
            width={width}
            height={height}
            className={`${className} ${styles.clickableImage} ${imageLoaded ? styles.loaded : ''}`}
            sizes={sizes}
            onLoadingComplete={handleImageLoad}
            onError={handleImageError}
            priority={priority}
            loading={priority ? "eager" : "lazy"}
            placeholder={placeholder === 'blur' ? 'empty' : placeholder}
            quality={quality}
            fill={false}
          />
        )}

        {!hasError && !urlIsInvalid && (
          <div className={styles.overlay}>
            <ZoomIn size={32} />
            <span>Click or press Enter to view full size</span>
          </div>
        )}
      </div>

      {caption && (
        <p className={styles.caption} id={`${alt.replace(/[^a-zA-Z0-9]/g, '-')}-caption`}>
          {caption}
        </p>
      )}

      {isOpen && !hasError && (
        <div
          className={styles.modal}
          onClick={closePreview}
          role="dialog"
          aria-modal="true"
          aria-label="Image preview modal"
        >
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={closePreview}
              className={styles.closeButton}
              title="Close preview"
              aria-label="Close image preview"
            >
              <X size={24} />
            </button>
            <div className={styles.imageContainer}>
              <Image
                src={src}
                alt={alt}
                width={1200}
                height={800}
                className={styles.originalImage}
                onLoadingComplete={() => setIsLoading(false)}
                onError={handleImageError}
                quality={90}
                priority={true}
                loading="eager"
                placeholder="empty"
                fill={false}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
