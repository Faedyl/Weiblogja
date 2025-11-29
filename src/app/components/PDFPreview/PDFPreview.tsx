'use client'

import { useState } from 'react'
import { FileText, X, ExternalLink } from 'lucide-react'
import styles from './PDFPreview.module.css'

interface PDFPreviewProps {
  pdfUrl: string
  title?: string
}

export default function PDFPreview({ pdfUrl, title = 'View Original PDF' }: PDFPreviewProps) {
  const [isOpen, setIsOpen] = useState(false)

  const openPreview = () => setIsOpen(true)
  const closePreview = () => setIsOpen(false)

  // Convert S3 URL to API URL for serving through our own endpoint
  const getApiUrl = (s3Url: string): string => {
    try {
      // Extract the key from the S3 URL
      // S3 URL format: https://{bucket}.s3.{region}.amazonaws.com/{key}
      const url = new URL(s3Url)
      const key = url.pathname.substring(1) // Remove leading '/'
      return `/api/pdf/file/${key}`
    } catch (error) {
      // If URL parsing fails, return original (this shouldn't happen in production)
      console.error('Failed to parse S3 URL:', error)
      return s3Url
    }
  }

  const apiUrl = getApiUrl(pdfUrl)

  return (
    <>
      <button
        onClick={openPreview}
        className={styles.pdfButton}
        title={title}
      >
        <FileText size={20} />
        <span>View Original PDF</span>
      </button>

      {isOpen && (
        <div className={styles.modal} onClick={closePreview}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>
                <FileText size={20} />
                PDF Preview
              </h3>
              <div className={styles.headerActions}>
                <a
                  href={apiUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.openButton}
                  title="Open in new tab"
                >
                  <ExternalLink size={18} />
                  Open
                </a>
                <button
                  onClick={closePreview}
                  className={styles.closeButton}
                  title="Close preview"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className={styles.pdfContainer}>
              <iframe
                src={apiUrl}
                className={styles.pdfIframe}
                title="PDF Preview"
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}