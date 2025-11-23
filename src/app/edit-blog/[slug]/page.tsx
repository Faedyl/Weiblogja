'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Save, ArrowLeft, X, Plus, Loader2 } from 'lucide-react';
import { BlogPost } from '@/lib/dynamodb';
import styles from './edit-blog.module.css';

export default function EditBlogPage() {
	const router = useRouter();
	const params = useParams();
	const slug = params.slug as string;

	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [blog, setBlog] = useState<BlogPost | null>(null);
	const [title, setTitle] = useState('');
	const [summary, setSummary] = useState('');
	const [content, setContent] = useState('');
	const [category, setCategory] = useState('');
	const [tags, setTags] = useState<string[]>([]);
	const [newTag, setNewTag] = useState('');
	const [status, setStatus] = useState<'draft' | 'published'>('published');

	useEffect(() => {
		fetchBlog();
	}, [slug]);

	const fetchBlog = async () => {
		setLoading(true);
		try {
			const response = await fetch(`/api/blogs/all`);
			if (response.ok) {
				const data = await response.json();
				const foundBlog = data.blogs.find((b: BlogPost) => b.slug === slug);
				if (foundBlog) {
					setBlog(foundBlog);
					setTitle(foundBlog.title);
					setSummary(foundBlog.summary || '');
					setContent(foundBlog.content);
					setCategory(foundBlog.category || '');
					setTags(foundBlog.tags || []);
					setStatus(foundBlog.status);
				} else {
					alert('Blog not found');
					router.push('/my-blogs');
				}
			}
		} catch (error) {
			console.error('Error fetching blog:', error);
			alert('Failed to load blog');
		} finally {
			setLoading(false);
		}
	};

	const handleSave = async () => {
		if (!title.trim()) {
			alert('Please enter a blog title');
			return;
		}

		setSaving(true);
		try {
			const response = await fetch(`/api/blogs/${slug}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					title,
					content,
					category,
					summary,
					tags,
					status,
				}),
			});

			if (response.ok) {
				alert('✅ Blog updated successfully!');
				router.push('/my-blogs');
			} else {
				throw new Error('Failed to update blog');
			}
		} catch (error) {
			console.error('Error updating blog:', error);
			alert('❌ Failed to update blog. Please try again.');
		} finally {
			setSaving(false);
		}
	};

	const addTag = () => {
		if (newTag.trim() && !tags.includes(newTag.trim())) {
			setTags([...tags, newTag.trim()]);
			setNewTag('');
		}
	};

	const removeTag = (tagToRemove: string) => {
		setTags(tags.filter(tag => tag !== tagToRemove));
	};

	if (loading) {
		return (
			<div className={styles.container}>
				<div className={styles.loadingState}>
					<Loader2 size={40} className={styles.spinner} />
					<p>Loading blog...</p>
				</div>
			</div>
		);
	}

	return (
		<div className={styles.container}>
			<div className={styles.header}>
				<button
					onClick={() => router.push('/my-blogs')}
					className={styles.backButton}
				>
					<ArrowLeft size={20} />
					Back to My Blogs
				</button>
				<div className={styles.headerActions}>
					<select
						value={status}
						onChange={(e) => setStatus(e.target.value as 'draft' | 'published')}
						className={styles.statusSelect}
					>
						<option value="published">Published</option>
						<option value="draft">Draft</option>
					</select>
					<button
						onClick={handleSave}
						disabled={saving}
						className={styles.saveButton}
					>
						{saving ? (
							<>
								<Loader2 size={18} className={styles.buttonSpinner} />
								Saving...
							</>
						) : (
							<>
								<Save size={18} />
								Save Changes
							</>
						)}
					</button>
				</div>
			</div>

			<div className={styles.editCard}>
				<h1 className={styles.pageTitle}>Edit Blog Post</h1>

				<div className={styles.formGroup}>
					<label className={styles.formLabel}>Title</label>
					<input
						type="text"
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						className={styles.formInput}
						placeholder="Enter blog title"
					/>
				</div>

				<div className={styles.formGroup}>
					<label className={styles.formLabel}>Summary</label>
					<textarea
						value={summary}
						onChange={(e) => setSummary(e.target.value)}
						className={styles.formTextarea}
						rows={3}
						placeholder="Enter a brief summary (optional)"
					/>
				</div>

				<div className={styles.formGroup}>
					<label className={styles.formLabel}>Category</label>
					<input
						type="text"
						value={category}
						onChange={(e) => setCategory(e.target.value)}
						className={styles.formInput}
						placeholder="e.g., Technology, Lifestyle, Tutorial"
					/>
				</div>

				<div className={styles.formGroup}>
					<label className={styles.formLabel}>Tags</label>
					<div className={styles.tagsEditor}>
						<div className={styles.tagsContainer}>
							{tags.map((tag, index) => (
								<span key={index} className={styles.tag}>
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
								onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
								className={styles.tagInput}
								placeholder="Add a tag"
							/>
							<button
								onClick={addTag}
								type="button"
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
						value={content}
						onChange={(e) => setContent(e.target.value)}
						className={`${styles.formTextarea} ${styles.contentEditor}`}
						rows={20}
						placeholder="Enter blog content (HTML supported)"
					/>
					<p className={styles.hint}>You can use HTML for formatting</p>
				</div>

				<div className={styles.formActions}>
					<button
						onClick={() => router.push('/my-blogs')}
						className={styles.cancelButton}
					>
						Cancel
					</button>
					<button
						onClick={handleSave}
						disabled={saving}
						className={styles.saveButtonLarge}
					>
						{saving ? (
							<>
								<Loader2 size={18} className={styles.buttonSpinner} />
								Saving...
							</>
						) : (
							<>
								<Save size={18} />
								Save Changes
							</>
						)}
					</button>
				</div>
			</div>
		</div>
	);
}
