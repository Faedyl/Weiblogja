'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { ConversionStatus, BlogConversionResult } from '@/types/pdf';
import { FileText, Upload, CheckCircle, AlertCircle, Loader, Sparkles, Edit, Save, Eye, X, Plus } from 'lucide-react';
import ImagePreview from '@/app/components/ImagePreview/ImagePreview';
import Notification, { NotificationType } from '@/app/components/Notification/Notification';
import styles from './create.module.css';

export default function CreatePage() {
	const [file, setFile] = useState<File | null>(null);
	const [status, setStatus] = useState<ConversionStatus | null>(null);
	const [result, setResult] = useState<BlogConversionResult | null>(null);
	const [isProcessing, setIsProcessing] = useState(false);
	const [isDragging, setIsDragging] = useState(false);
	const [editMode, setEditMode] = useState(false);
	const [editedTitle, setEditedTitle] = useState('');
	const [editedSummary, setEditedSummary] = useState('');
	const [editedContent, setEditedContent] = useState('');
	const [editedTags, setEditedTags] = useState<string[]>([]);
	const [newTag, setNewTag] = useState('');
	const [isPublishing, setIsPublishing] = useState(false);
	const [notification, setNotification] = useState<{ isOpen: boolean; message: string; type: NotificationType }>({
		isOpen: false,
		message: '',
		type: 'info',
	});
	const fileInputRef = useRef<HTMLInputElement>(null);
	const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
	const currentProgressRef = useRef<number>(25);

	const showNotification = (message: string, type: NotificationType = 'info') => {
		setNotification({ isOpen: true, message, type });
	};

	// Cleanup interval on unmount
	useEffect(() => {
		return () => {
			if (progressIntervalRef.current) {
				clearInterval(progressIntervalRef.current);
			}
		};
	}, []);

	const validateFile = (file: File): string | null => {
		if (file.type !== 'application/pdf') {
			return 'Please select a PDF file';
		}
		if (file.size > 50 * 1024 * 1024) {
			return 'File size must be less than 50MB';
		}
		return null;
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFile = e.target.files?.[0];
		if (selectedFile) {
			const error = validateFile(selectedFile);
			if (error) {
				showNotification(error, 'error');
				return;
			}
			setFile(selectedFile);
			setResult(null);
			setStatus(null);
		}
	};

	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(true);
	}, []);

	const handleDragLeave = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);
	}, []);

	const handleDrop = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);

		const droppedFile = e.dataTransfer.files[0];
		if (droppedFile) {
			const error = validateFile(droppedFile);
			if (error) {
				showNotification(error, 'error');
				return;
			}
			setFile(droppedFile);
			setResult(null);
			setStatus(null);
		}
	}, []);

	const handleUpload = async () => {
		if (!file) return;

		// Clear any existing progress interval
		if (progressIntervalRef.current) {
			clearInterval(progressIntervalRef.current);
			progressIntervalRef.current = null;
		}

		setIsProcessing(true);
		setStatus({
			id: '',
			status: 'uploading',
			progress: 10,
			message: 'Uploading your journal...',
		});

		try {
			const formData = new FormData();
			formData.append('file', file);

			// Update status right before fetch - extraction happens on backend
			currentProgressRef.current = 25;
			setStatus({
				id: '',
				status: 'extracting',
				progress: currentProgressRef.current,
				message: 'Processing PDF (this may take a minute)...',
			});

			// Simulate progress from 25% to 85% while waiting for response
			// Progress increases gradually, with slower increments as it approaches the limit
			const targetProgress = 85;
			progressIntervalRef.current = setInterval(() => {
				currentProgressRef.current += Math.random() * 3 + 1; // Increment by 1-4%
				
				// Never exceed 85% until response comes
				if (currentProgressRef.current >= targetProgress) {
					currentProgressRef.current = targetProgress;
					setStatus(prev => prev ? {
						...prev,
						progress: targetProgress,
					} : null);
					// Keep interval running but progress stays at 85%
				} else {
					setStatus(prev => prev ? {
						...prev,
						progress: Math.floor(currentProgressRef.current),
					} : null);
				}
			}, 500); // Update every 500ms for smooth animation

			const response = await fetch('/api/pdf/upload', {
				method: 'POST',
				body: formData,
			});

			// Clear progress simulation interval
			if (progressIntervalRef.current) {
				clearInterval(progressIntervalRef.current);
				progressIntervalRef.current = null;
			}

			if (!response.ok) {
				const error = await response.json();
				
				// Handle duplicate PDF error specially
				if (response.status === 409 && error.duplicate) {
					throw new Error(
						`This PDF has already been uploaded!\n\n` +
						`Existing blog: "${error.existingBlog.title}"\n` +
						`Created: ${new Date(error.existingBlog.createdAt).toLocaleDateString()}\n` +
						`Author: ${error.existingBlog.author}\n\n` +
						`View it at: ${error.existingBlog.url}`
					);
				}
				
				throw new Error(error.error || 'Upload failed');
			}

			// Update status after response is received - now parsing and showing result
			setStatus({
				id: '',
				status: 'converting',
				progress: 90,
				message: 'Finalizing your blog post...',
			});

			const data = await response.json();

			setStatus({
				id: data.conversionId,
				status: 'completed',
				progress: 100,
				message: 'Your blog post is ready!',
				result: data.result,
			});

			setResult(data.result);
			setEditedTitle(data.result.title);
			setEditedSummary(data.result.summary);
			setEditedContent(data.result.content);
			setEditedTags(data.result.tags);
		} catch (error) {
			// Clear progress simulation interval on error
			if (progressIntervalRef.current) {
				clearInterval(progressIntervalRef.current);
				progressIntervalRef.current = null;
			}

			setStatus({
				id: '',
				status: 'failed',
				progress: 0,
				message: 'Conversion failed',
				error: error instanceof Error ? error.message : 'Unknown error',
			});
		} finally {
			setIsProcessing(false);
		}
	};

	const handleReset = () => {
		setFile(null);
		setResult(null);
		setStatus(null);
		setEditMode(false);
		if (fileInputRef.current) {
			fileInputRef.current.value = '';
		}
	};

	const toggleEditMode = () => {
		if (!editMode && result) {
			setEditedTitle(result.title);
			setEditedSummary(result.summary);
			setEditedContent(result.content);
			setEditedTags(result.tags);
		}
		setEditMode(!editMode);
	};

	const handleSaveEdit = () => {
		if (result) {
			setResult({
				...result,
				title: editedTitle,
				summary: editedSummary,
				content: editedContent,
				tags: editedTags,
			});
		}
		setEditMode(false);
	};

	const handlePublish = async (isDraft: boolean = false) => {
		if (!result) return;

		setIsPublishing(true);
		try {
			// Get current user from session
			const sessionResponse = await fetch('/api/auth/session');
			const sessionData = await sessionResponse.json();
			const authorId = sessionData?.user?.name || sessionData?.user?.email || 'Anonymous';

			const blogData = {
				title: result.title,
				content: result.content,
				author_id: authorId,
				category: result.tags[0] || 'General',
				tags: result.tags,
				summary: result.summary,
				status: isDraft ? 'draft' : 'published',
				thumbnail_url: result.thumbnailUrl || '',
				logo_url: result.logoUrl || '',
				images: result.imageUrls || [],
				pdf_url: result.pdfUrl || '',
				pdf_hash: result.pdfHash || ''
			};

			const response = await fetch('/api/blogs', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(blogData),
			});

			if (!response.ok) {
				throw new Error('Failed to publish blog');
			}

			const data = await response.json();
			
			if (data.success) {
				showNotification(
					isDraft ? 'Blog saved as draft!' : 'Blog published successfully!',
					'success'
				);
				// Redirect to the blog page
				setTimeout(() => {
					window.location.href = `/blog/${data.blog.slug}`;
				}, 1000);
			} else {
				throw new Error('Failed to create blog post');
			}
		} catch (error) {
			console.error('Publish error:', error);
			showNotification('Failed to publish blog. Please try again.', 'error');
		} finally {
			setIsPublishing(false);
		}
	};

	const addTag = () => {
		if (newTag && !editedTags.includes(newTag.trim())) {
			setEditedTags([...editedTags, newTag.trim()]);
			setNewTag('');
		}
	};

	const removeTag = (tagToRemove: string) => {
		setEditedTags(editedTags.filter(tag => tag !== tagToRemove));
	};

	const handleBrowseClick = () => {
		fileInputRef.current?.click();
	};

	return (
		<div className={styles.container}>
			<div className={styles.header}>
				<div className={styles.headerContent}>
					<Sparkles className={styles.headerIcon} size={36} />
					<h1 className={styles.title}>Transform Journal to Blog</h1>
					<p className={styles.subtitle}>Upload your PDF journal and let AI create an engaging blog post</p>
				</div>
			</div>

			{/* Upload Section */}
			{!result && (
				<div className={styles.uploadContainer}>
					<div 
						className={`${styles.dropZone} ${isDragging ? styles.dropZoneActive : ''} ${file ? styles.dropZoneHasFile : ''}`}
						onDragOver={handleDragOver}
						onDragLeave={handleDragLeave}
						onDrop={handleDrop}
					>
						<input
							ref={fileInputRef}
							type="file"
							accept=".pdf"
							onChange={handleFileChange}
							className={styles.fileInputHidden}
						/>
						
						{!file ? (
							<div className={styles.dropZoneContent}>
								<Upload className={styles.dropZoneIcon} size={48} />
								<h3 className={styles.dropZoneTitle}>Drop your PDF here</h3>
								<p className={styles.dropZoneText}>or</p>
								<button 
									onClick={handleBrowseClick}
									className={`${styles.button} ${styles.browseButton}`}
								>
									<FileText size={20} />
									Browse Files
								</button>
								<p className={styles.dropZoneHint}>Maximum file size: 50MB</p>
							</div>
						) : (
							<div className={styles.filePreview}>
								<FileText className={styles.fileIcon} size={48} />
								<div className={styles.fileDetails}>
									<h4 className={styles.fileName}>{file.name}</h4>
									<p className={styles.fileSize}>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
								</div>
								<button 
									onClick={handleReset}
									className={styles.removeFileButton}
									aria-label="Remove file"
								>
									<X size={20} />
								</button>
							</div>
						)}
					</div>

					{file && !status && (
						<button
							onClick={handleUpload}
							disabled={isProcessing}
							className={`${styles.button} ${styles.convertButton}`}
						>
							<Sparkles size={20} />
							Convert to Blog Post
						</button>
					)}
				</div>
			)}

			{/* Status Section */}
			{status && !result && (
				<div className={styles.statusCard}>
					<div className={styles.statusIconContainer}>
						{status.status === 'failed' ? (
							<AlertCircle className={styles.statusIconError} size={48} />
						) : status.status === 'completed' ? (
							<CheckCircle className={styles.statusIconSuccess} size={48} />
						) : (
							<Loader className={`${styles.statusIconLoading} ${styles.spin}`} size={48} />
						)}
					</div>
					
					<h2 className={styles.statusTitle}>{status.message}</h2>
					
					<div className={styles.progressContainer}>
						<div className={styles.progressBarWrapper}>
							<div
								className={`${styles.progressBar} ${status.status === 'failed' ? styles.progressBarError : ''}`}
								style={{ width: `${status.progress}%` }}
							/>
						</div>
						<span className={styles.progressText}>{status.progress}%</span>
					</div>

					{status.error && (
						<div className={styles.errorAlert}>
							<AlertCircle size={20} />
							<div>
								<strong>Error:</strong> {status.error}
							</div>
						</div>
					)}

					{status.status === 'failed' && (
						<button onClick={handleReset} className={`${styles.button} ${styles.secondaryButton}`}>
							Try Again
						</button>
					)}
				</div>
			)}

			{/* Result Section */}
			{result && (
				<div className={styles.resultWrapper}>
					<div className={styles.resultActions}>
						<button
							onClick={handleReset}
							className={`${styles.button} ${styles.secondaryButton}`}
						>
							<Upload size={18} />
							Upload New PDF
						</button>
						<button
							onClick={toggleEditMode}
							className={`${styles.button} ${editMode ? styles.secondaryButton : styles.primaryButton}`}
						>
							{editMode ? (
								<>
									<Eye size={18} />
									Preview
								</>
							) : (
								<>
									<Edit size={18} />
									Edit
								</>
							)}
						</button>
					</div>

					<div className={styles.resultCard}>
						{editMode ? (
							<div className={styles.editContainer}>
								<div className={styles.formGroup}>
									<label className={styles.formLabel}>Title</label>
									<input
										type="text"
										value={editedTitle}
										onChange={(e) => setEditedTitle(e.target.value)}
										className={styles.formInput}
										placeholder="Enter blog title"
									/>
								</div>

								<div className={styles.formGroup}>
									<label className={styles.formLabel}>Summary</label>
									<textarea
										value={editedSummary}
										onChange={(e) => setEditedSummary(e.target.value)}
										className={styles.formTextarea}
										rows={3}
										placeholder="Enter blog summary"
									/>
								</div>

								<div className={styles.formGroup}>
									<label className={styles.formLabel}>Tags</label>
									<div className={styles.tagsEditor}>
										<div className={styles.tagsContainer}>
											{editedTags.map((tag, index) => (
												<span key={index} className={styles.tagEditable}>
													{tag}
													<button
														onClick={() => removeTag(tag)}
														className={styles.tagRemove}
														aria-label="Remove tag"
													>
														<X size={14} />
													</button>
												</span>
											))}
										</div>
										<div className={styles.tagInputGroup}>
											<input
												type="text"
												value={newTag}
												onChange={(e) => setNewTag(e.target.value)}
												onKeyPress={(e) => e.key === 'Enter' && addTag()}
												className={styles.tagInput}
												placeholder="Add a tag"
											/>
											<button
												onClick={addTag}
												className={styles.addTagButton}
											>
												<Plus size={18} />
											</button>
										</div>
									</div>
								</div>

								<div className={styles.formGroup}>
									<label className={styles.formLabel}>Content</label>
									<textarea
										value={editedContent}
										onChange={(e) => setEditedContent(e.target.value)}
										className={`${styles.formTextarea} ${styles.contentEditor}`}
										rows={20}
										placeholder="Enter blog content (HTML supported)"
									/>
								</div>

								<button
									onClick={handleSaveEdit}
									className={`${styles.button} ${styles.successButton}`}
								>
									<Save size={18} />
									Save Changes
								</button>
							</div>
						) : (
							<div className={styles.previewContainer}>
								<h1 className={styles.resultTitle}>{result.title}</h1>
								<p className={styles.resultSummary}>{result.summary}</p>
								
								<div className={styles.tagsContainer}>
									{result.tags.map((tag, index) => (
										<span key={index} className={styles.tag}>
											{tag}
										</span>
									))}
								</div>

								{result.imageUrls && result.imageUrls.length > 0 && (
									<div className={styles.imagesSection}>
										<h3 className={styles.sectionTitle}>Extracted Images ({result.imageUrls.length})</h3>
										<div className={styles.imagesGrid}>
											{result.imageUrls.map((url, index) => (
												<ImagePreview 
													key={index}
													src={url}
													alt={`Extracted image ${index + 1}`}
													caption={`Page ${index + 1}`}
													width={300}
													height={200}
													className={styles.imagePreviewItem}
												/>
											))}
										</div>
									</div>
								)}

								<div
									className={styles.resultContent}
									dangerouslySetInnerHTML={{ __html: result.content }}
								/>
							</div>
						)}
					</div>

					{!editMode && (
						<div className={styles.publishCard}>
							<h3 className={styles.publishTitle}>Ready to Publish?</h3>
							<div className={styles.publishActions}>
								<button 
									className={`${styles.button} ${styles.outlineButton}`}
									onClick={() => handlePublish(true)}
									disabled={isPublishing}
								>
									{isPublishing ? 'Saving...' : 'Save as Draft'}
								</button>
								<button 
									className={`${styles.button} ${styles.publishButton}`}
									onClick={() => handlePublish(false)}
									disabled={isPublishing}
								>
									<Sparkles size={18} />
									{isPublishing ? 'Publishing...' : 'Publish Now'}
								</button>
							</div>
						</div>
					)}
				</div>
			)}

			<Notification
				isOpen={notification.isOpen}
				message={notification.message}
				type={notification.type}
				onClose={() => setNotification({ ...notification, isOpen: false })}
			/>
		</div>
	);
}
