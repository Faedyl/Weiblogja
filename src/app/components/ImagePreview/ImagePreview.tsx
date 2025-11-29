'use client'

import { useState } from 'react'
import Image from 'next/image'
import { X, ZoomIn } from 'lucide-react'
import styles from './ImagePreview.module.css'

interface ImagePreviewProps {
  src: string
  alt: string
  width?: number
  height?: number
  className?: string
  caption?: string
  sizes?: string
}

export default function ImagePreview({ 
  src, 
  alt, 
  width = 800, 
  height = 400, 
  className = '',
  caption,
  sizes = "(max-width: 480px) 100vw, (max-width: 768px) 100vw, 800px"
}: ImagePreviewProps) {
  const [isOpen, setIsOpen] = useState(false)

  const openPreview = () => setIsOpen(true)
  const closePreview = () => setIsOpen(false)

  return (
    <>
      <div className={styles.imageWrapper} onClick={openPreview}>
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          className={`${className} ${styles.clickableImage}`}
          sizes={sizes}
        />
        <div className={styles.overlay}>
          <ZoomIn size={32} />
          <span>Click to view original size</span>
        </div>
      </div>
      {caption && <p className={styles.caption}>{caption}</p>}

      {isOpen && (
        <div className={styles.modal} onClick={closePreview}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={closePreview}
              className={styles.closeButton}
              title="Close preview"
            >
              <X size={24} />
            </button>
            <div className={styles.imageContainer}>
              <img
                src={src}
                alt={alt}
                className={styles.originalImage}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
