'use client'
import { useEffect } from 'react'
import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Image as ImageIcon, X, Upload } from 'lucide-react'
import styles from './create.module.css'
import { useAuth } from '@/contexts/AuthContext'

interface ImageData {
        url: string
        alt: string
        caption?: string
        position: number
}

export default function CreateBlog() {
        const router = useRouter()
        const { isAuthenticated, isAuthor, loading: authLoading } = useAuth()
        const [submitting, setSubmitting] = useState(false)
        const [uploadingImage, setUploadingImage] = useState(false)
        const [formData, setFormData] = useState({
                title: '',
                content: '',
                category: '',
                author_id: 'Faedyl',
                thumbnail_url: '',
                images: [] as ImageData[]
        })
        useEffect(() => {
                if (!authLoading && (!isAuthenticated || !isAuthor)) {
                        router.push('/login')
                }
        }, [isAuthenticated, isAuthor, submitting, router])

        // Show loading while checking auth
        if (authLoading) {
                return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>
        }

        // Don't render if not authorized
        if (!isAuthenticated || !isAuthor) {
                return null
        }

        const handleSubmit = async (e: FormEvent) => {
                e.preventDefault()
                setSubmitting(true)

                try {
                        const response = await fetch('/api/blogs', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(formData)
                        })

                        if (response.ok) {
                                const data = await response.json()
                                alert('Blog created successfully!')
                                router.push(`/blog/${data.blog.slug}`)
                        } else {
                                alert('Failed to create blog')
                        }
                } catch (error) {
                        console.error('Error creating blog:', error)
                        alert('Error creating blog')
                } finally {
                        setSubmitting(false)
                }
        }

        const handleImageUpload = async (file: File, type: 'thumbnail' | 'content') => {
                setUploadingImage(true)
                try {
                        // Step 1: Get presigned URL
                        const uploadResponse = await fetch('/api/upload', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                        fileName: file.name,
                                        fileType: file.type,
                                        directory: 'blog_images',
                                        authorId: formData.author_id,
                                        blogSlug: formData.title.toLowerCase().replace(/\s+/g, '-') || 'untitled'
                                })
                        })

                        const { uploadUrl, publicUrl } = await uploadResponse.json()

                        // Step 2: Upload to S3
                        await fetch(uploadUrl, {
                                method: 'PUT',
                                headers: { 'Content-Type': file.type },
                                body: file
                        })

                        // Step 3: Update form data
                        if (type === 'thumbnail') {
                                setFormData({ ...formData, thumbnail_url: publicUrl })
                        } else {
                                const newImage: ImageData = {
                                        url: publicUrl,
                                        alt: file.name,
                                        caption: '',
                                        position: formData.images.length + 1
                                }
                                setFormData({
                                        ...formData,
                                        images: [...formData.images, newImage]
                                })
                        }

                        alert('Image uploaded successfully!')
                } catch (error) {
                        console.error('Upload error:', error)
                        alert('Failed to upload image')
                } finally {
                        setUploadingImage(false)
                }
        }

        const removeImage = (index: number) => {
                const updatedImages = formData.images
                        .filter((_, i) => i !== index)
                        .map((img, i) => ({ ...img, position: i + 1 }))
                setFormData({ ...formData, images: updatedImages })
        }
        return (
                <div className={styles.container}>
                        <header className={styles.header}>
                                <h1>Create New Blog Post</h1>
                                <p className={styles.subtitle}>Share your ideas with the world</p>
                        </header>

                        <form onSubmit={handleSubmit} className={styles.form}>
                                <div className={styles.formGroup}>
                                        <label htmlFor="title">
                                                Title <span className={styles.required}>*</span>
                                        </label>
                                        <input
                                                id="title"
                                                type="text"
                                                value={formData.title}
                                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                                required
                                                placeholder="Enter an engaging title for your blog"
                                                className={styles.input}
                                        />
                                </div>

                                <div className={styles.formGroup}>
                                        <label htmlFor="category">Category</label>
                                        <input
                                                id="category"
                                                type="text"
                                                value={formData.category}
                                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                                placeholder="e.g., Technology, Science, Tutorial"
                                                className={styles.input}
                                        />
                                </div>

                                <div className={styles.formGroup}>
                                        <label htmlFor="content">
                                                Content <span className={styles.required}>*</span>
                                        </label>
                                        <textarea
                                                id="content"
                                                value={formData.content}
                                                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                                required
                                                rows={15}
                                                placeholder="Write your blog content here... Use double line breaks to separate paragraphs."
                                                className={styles.textarea}
                                        />
                                        <small className={styles.hint}>
                                                Tip: Use double line breaks (press Enter twice) to create new paragraphs
                                        </small>
                                </div>

                                <div className={styles.imageSection}>
                                        <h3>Images</h3>

                                        <div className={styles.formGroup}>
                                                <label htmlFor="thumbnail">
                                                        <ImageIcon size={18} />
                                                        Thumbnail Image (Optional)
                                                </label>
                                                <input
                                                        id="thumbnail"
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => {
                                                                const file = e.target.files?.[0]
                                                                if (file) handleImageUpload(file, 'thumbnail')
                                                        }}
                                                        className={styles.fileInput}
                                                        disabled={uploadingImage}
                                                />
                                                {formData.thumbnail_url && (
                                                        <div className={styles.thumbnailPreview}>
                                                                <img src={formData.thumbnail_url} alt="Thumbnail preview" />
                                                                <button
                                                                        type="button"
                                                                        onClick={() => setFormData({ ...formData, thumbnail_url: '' })}
                                                                        className={styles.removeBtn}
                                                                >
                                                                        <X size={16} /> Remove
                                                                </button>
                                                        </div>
                                                )}
                                        </div>

                                        <div className={styles.formGroup}>
                                                <label htmlFor="contentImages">
                                                        <ImageIcon size={18} />
                                                        Content Images (Optional)
                                                </label>
                                                <input
                                                        id="contentImages"
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => {
                                                                const file = e.target.files?.[0]
                                                                if (file) {
                                                                        handleImageUpload(file, 'content')
                                                                        e.target.value = '' // Reset input
                                                                }
                                                        }}
                                                        className={styles.fileInput}
                                                        disabled={uploadingImage}
                                                />
                                                <small className={styles.hint}>
                                                        Images will be inserted between paragraphs in order
                                                </small>

                                                {formData.images.length > 0 && (
                                                        <div className={styles.imageList}>
                                                                {formData.images.map((img, index) => (
                                                                        <div key={index} className={styles.imageItem}>
                                                                                <img src={img.url} alt={img.alt} />
                                                                                <div className={styles.imageInfo}>
                                                                                        <span>Position: After paragraph {img.position}</span>
                                                                                        <button
                                                                                                type="button"
                                                                                                onClick={() => removeImage(index)}
                                                                                                className={styles.removeBtn}
                                                                                        >
                                                                                                <X size={16} /> Remove
                                                                                        </button>
                                                                                </div>
                                                                        </div>
                                                                ))}
                                                        </div>
                                                )}
                                        </div>
                                </div>

                                <div className={styles.actions}>
                                        <button
                                                type="submit"
                                                disabled={submitting || uploadingImage}
                                                className={styles.btnSubmit}
                                        >
                                                <Save size={20} />
                                                {submitting ? 'Creating...' : 'Publish Blog Post'}
                                        </button>
                                        <button
                                                type="button"
                                                onClick={() => router.back()}
                                                className={styles.btnCancel}
                                                disabled={submitting}
                                        >
                                                Cancel
                                        </button>
                                </div>
                        </form>

                        {uploadingImage && (
                                <div className={styles.uploadOverlay}>
                                        <div className={styles.uploadSpinner}>
                                                <Upload size={40} />
                                                <p>Uploading image...</p>
                                        </div>
                                </div>
                        )}
                </div>
        )
}
