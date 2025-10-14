'use client'

import { useState } from 'react'
import styles from './test-s3.module.css'

export default function TestS3Page() {
	const [uploadState, setUploadState] = useState({
		file: null as File | null,
		uploading: false,
		result: null as any,
		error: null as string | null
	})

	const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0]
		if (file) {
			setUploadState(prev => ({
				...prev,
				file,
				result: null,
				error: null
			}))
		}
	}

	// Update the testS3Upload function to handle errors better
	const testS3Upload = async () => {
		if (!uploadState.file) return

		setUploadState(prev => ({ ...prev, uploading: true, error: null }))

		try {
			console.log('🚀 Starting S3 upload test...')

			// Step 1: Get presigned URL
			const response = await fetch('/api/upload', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					fileName: uploadState.file.name,
					fileType: uploadState.file.type,
					directory: 'BLOG_THUMBNAILS',
					authorId: 'Faedyl',
					blogSlug: 'test-upload-' + Date.now()
				})
			})

			if (!response.ok) {
				const errorData = await response.json()
				throw new Error(`API Error: ${errorData.error}`)
			}

			const result = await response.json()
			console.log('✅ Got presigned URL:', result)

			// Step 2: Upload to S3 with EXACT headers that match the signature
			console.log('📤 Uploading to S3...')
			const uploadResponse = await fetch(result.uploadUrl, {
				method: 'PUT',
				body: uploadState.file,
				headers: {
					'Content-Type': result.fileType, // Use the exact fileType from the response
				}
			})

			console.log('📊 S3 Response Status:', uploadResponse.status)

			if (uploadResponse.ok) {
				console.log('✅ Successfully uploaded to S3!')

				setUploadState(prev => ({
					...prev,
					uploading: false,
					result: {
						...result,
						uploadSuccess: true,
						s3Response: uploadResponse.status,
						message: 'Upload successful! Image is now available in S3.'
					}
				}))
			} else {
				const errorText = await uploadResponse.text()
				console.error('❌ S3 Error Response:', errorText)
				throw new Error(`S3 Upload failed: ${uploadResponse.status}\nDetails: ${errorText}`)
			}

		} catch (error) {
			console.error('❌ Upload failed:', error)
			setUploadState(prev => ({
				...prev,
				uploading: false,
				error: error.message
			}))
		}
	}
	return (
		<div className={styles.container}>
			<h1>🧪 S3 Upload Test for Faedyl&apos;s Weiblogja</h1>

			<div className={styles.testSection}>
				<h2>📤 Test Image Upload</h2>

				<div className={styles.uploadArea}>
					<input
						type="file"
						accept="image/*"
						onChange={handleFileSelect}
						className={styles.fileInput}
					/>

					{uploadState.file && (
						<div className={styles.fileInfo}>
							<p><strong>Selected:</strong> {uploadState.file.name}</p>
							<p><strong>Size:</strong> {(uploadState.file.size / 1024).toFixed(2)} KB</p>
							<p><strong>Type:</strong> {uploadState.file.type}</p>

							<button
								onClick={testS3Upload}
								disabled={uploadState.uploading}
								className={styles.uploadButton}
							>
								{uploadState.uploading ? '⏳ Uploading...' : '🚀 Test S3 Upload'}
							</button>
						</div>
					)}

					{uploadState.error && (
						<div className={styles.error}>
							<h3>❌ Error:</h3>
							<p>{uploadState.error}</p>
						</div>
					)}

					{uploadState.result && (
						<div className={styles.success}>
							<h3>✅ Upload Successful!</h3>
							<div className={styles.resultDetails}>
								<p><strong>Public URL:</strong></p>
								<a href={uploadState.result.publicUrl} target="_blank" rel="noopener noreferrer">
									{uploadState.result.publicUrl}
								</a>
								<br /><br />
								<p><strong>S3 Key:</strong> {uploadState.result.key}</p>
								<p><strong>Directory:</strong> {uploadState.result.directory}</p>
								<p><strong>Sub Path:</strong> {uploadState.result.subPath}</p>

								{uploadState.result.publicUrl && (
									<div className={styles.imagePreview}>
										<h3>📸 Preview:</h3>
										<img
											src={uploadState.result.publicUrl}
											alt="Uploaded preview"
											className={styles.previewImage}
										/>
									</div>
								)}
							</div>
						</div>
					)}
				</div>
			</div>

			<div className={styles.instructions}>
				<h2>📋 Test Instructions</h2>
				<ol>
					<li>Select an image file</li>
					<li>Click "Test S3 Upload"</li>
					<li>Check if the upload succeeds</li>
					<li>Verify the image URL works</li>
					<li>Check your S3 bucket for the uploaded file</li>
				</ol>
			</div>
		</div>
	)
}
