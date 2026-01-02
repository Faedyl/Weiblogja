'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Edit, Trash2, Eye, Loader2, PlusCircle, BookOpen, Calendar, Bot } from 'lucide-react';
import { BlogPost } from '@/lib/dynamodb';
import ConfirmDialog from '@/app/components/ConfirmDialog/ConfirmDialog';
import Notification, { NotificationType } from '@/app/components/Notification/Notification';
import styles from './my-blogs.module.css';

export default function MyBlogsPage() {
	const { data: session, status } = useSession();
	const router = useRouter();
	const [blogs, setBlogs] = useState<BlogPost[]>([]);
	const [loading, setLoading] = useState(true);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean; slug: string | null }>({
		isOpen: false,
		slug: null,
	});
	const [notification, setNotification] = useState<{ isOpen: boolean; message: string; type: NotificationType }>({
		isOpen: false,
		message: '',
		type: 'info',
	});

	const showNotification = (message: string, type: NotificationType = 'info') => {
		setNotification({ isOpen: true, message, type });
	};

	useEffect(() => {
		if (status === 'unauthenticated') {
			router.push('/profile');
			return;
		}

		if (status === 'authenticated') {
			fetchMyBlogs();
		}
	}, [status, router]);

	const fetchMyBlogs = async () => {
		setLoading(true);
		try {
			const response = await fetch('/api/blogs/my-blogs');
			if (response.ok) {
				const data = await response.json();
				setBlogs(data.blogs || []);
			}
		} catch (error) {
			console.error('Error fetching blogs:', error);
		} finally {
			setLoading(false);
		}
	};

	const handleDeleteClick = (slug: string) => {
		setDeleteDialog({ isOpen: true, slug });
	};

	const handleDeleteConfirm = async () => {
		if (!deleteDialog.slug) return;

		const slug = deleteDialog.slug;
		setDeleteDialog({ isOpen: false, slug: null });
		setDeletingId(slug);

		try {
			const response = await fetch(`/api/blogs/${slug}`, {
				method: 'DELETE',
			});

			if (response.ok) {
				setBlogs(blogs.filter(blog => blog.slug !== slug));
				showNotification('Blog deleted successfully!', 'success');
			} else {
				throw new Error('Failed to delete blog');
			}
		} catch (error) {
			console.error('Error deleting blog:', error);
			showNotification('Failed to delete blog. Please try again.', 'error');
		} finally {
			setDeletingId(null);
		}
	};

	const handleDeleteCancel = () => {
		setDeleteDialog({ isOpen: false, slug: null });
	};

	const handleEdit = (slug: string) => {
		router.push(`/edit-blog/${slug}`);
	};

	const handleView = (slug: string) => {
		router.push(`/blog/${slug}`);
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	};

	if (status === 'loading' || loading) {
		return (
			<div className={styles.container}>
				<div className={styles.loadingState}>
					<Loader2 size={40} className={styles.spinner} />
					<p>Loading your blogs...</p>
				</div>
			</div>
		);
	}

	return (
		<div className={styles.container}>
			<div className={styles.header}>
				<div className={styles.headerContent}>
					<BookOpen size={36} className={styles.headerIcon} />
					<div>
						<h1>My Blog Posts</h1>
						<p>Manage and organize your published content</p>
					</div>
				</div>
				<button 
					onClick={() => router.push('/create')}
					className={styles.createButton}
				>
					<PlusCircle size={20} />
					Create New Blog
				</button>
			</div>

			{blogs.length === 0 ? (
				<div className={styles.emptyState}>
					<BookOpen size={60} />
					<h3>No blogs yet</h3>
					<p>Start creating your first blog post!</p>
					<button 
						onClick={() => router.push('/create')}
						className={styles.createButtonLarge}
					>
						<PlusCircle size={28} />
						Create Your First Blog
					</button>
				</div>
			) : (
				<div className={styles.blogsSection}>
					<div className={styles.statsBar}>
						<div className={styles.stat}>
							<span className={styles.statLabel}>Total Blogs</span>
							<span className={styles.statValue}>{blogs.length}</span>
						</div>
						<div className={styles.stat}>
							<span className={styles.statLabel}>Total Views</span>
							<span className={styles.statValue}>
								{blogs.reduce((sum, blog) => sum + (blog.views || 0), 0)}
							</span>
						</div>
						<div className={styles.stat}>
							<span className={styles.statLabel}>Published</span>
							<span className={styles.statValue}>
								{blogs.filter(b => b.status === 'published').length}
							</span>
						</div>
						<div className={styles.stat}>
							<span className={styles.statLabel}>Drafts</span>
							<span className={styles.statValue}>
								{blogs.filter(b => b.status === 'draft').length}
							</span>
						</div>
					</div>

					<div className={styles.blogsList}>
						{blogs.map((blog) => (
							<div key={blog.PK} className={styles.blogCard}>
								<div className={styles.blogCardContent}>
									<div className={styles.blogCardHeader}>
										<h3 className={styles.blogTitle}>{blog.title}</h3>
										<div className={styles.blogBadges}>
											{blog.status === 'draft' && (
												<span className={styles.draftBadge}>Draft</span>
											)}
											{blog.ai_generated && (
												<span className={styles.aiBadge}>
													<Bot size={14} />
													<span>AI</span>
												</span>
											)}
										</div>
									</div>

									<div className={styles.blogMeta}>
										<span className={styles.metaItem}>
											<Calendar size={16} />
											{formatDate(blog.created_at)}
										</span>
										<span className={styles.metaItem}>
											<Eye size={16} />
											{blog.views || 0} views
										</span>
										{blog.category && (
											<span className={styles.categoryBadge}>
												{blog.category}
											</span>
										)}
									</div>

									{blog.tags && blog.tags.length > 0 && (
										<div className={styles.tagsRow}>
											{blog.tags.slice(0, 3).map((tag, index) => (
												<span key={index} className={styles.tag}>
													{tag}
												</span>
											))}
											{blog.tags.length > 3 && (
												<span className={styles.moreTag}>
													+{blog.tags.length - 3} more
												</span>
											)}
										</div>
									)}
								</div>

								<div className={styles.blogCardActions}>
									<button
										onClick={() => handleView(blog.slug)}
										className={`${styles.actionButton} ${styles.viewButton}`}
										title="View blog"
									>
										<Eye size={18} />
										View
									</button>
									<button
										onClick={() => handleEdit(blog.slug)}
										className={`${styles.actionButton} ${styles.editButton}`}
										title="Edit blog"
									>
										<Edit size={18} />
										Edit
									</button>
									<button
										onClick={() => handleDeleteClick(blog.slug)}
										disabled={deletingId === blog.slug}
										className={`${styles.actionButton} ${styles.deleteButton}`}
										title="Delete blog"
									>
										{deletingId === blog.slug ? (
											<Loader2 size={18} className={styles.buttonSpinner} />
										) : (
											<Trash2 size={18} />
										)}
										Delete
									</button>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			<ConfirmDialog
				isOpen={deleteDialog.isOpen}
				title="Delete Blog"
				message="Are you sure you want to delete this blog? This action cannot be undone."
				confirmText="Delete"
				cancelText="Cancel"
				onConfirm={handleDeleteConfirm}
				onCancel={handleDeleteCancel}
				variant="danger"
			/>

			<Notification
				isOpen={notification.isOpen}
				message={notification.message}
				type={notification.type}
				onClose={() => setNotification({ ...notification, isOpen: false })}
			/>
		</div>
	);
}
