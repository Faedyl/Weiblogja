"use client";

import { useState, useEffect } from "react";
import { signOut } from "next-auth/react";
import { Mail, Calendar, UserCircle, LogOut, Camera, Save, X, Edit, BookOpen, PenLine, Search, Clock, Eye } from "lucide-react";
import styles from "./ProfileView.module.css";
import pageStyles from "@/app/page.module.css"

interface ProfileViewProps {
	user: {
		id: string;
		email: string;
		name: string;
		avatar?: string;
		bio?: string;
		createdAt?: string;
		role?: 'visitor' | 'author' | 'admin';
	};
}

export default function ProfileView({ user }: ProfileViewProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [formData, setFormData] = useState({
		name: user.name,
		bio: user.bio || "",
	});
	const [selectedRole, setSelectedRole] = useState<'visitor' | 'author'>(
		(user.role === 'admin' ? 'author' : user.role) || 'visitor'
	);
	const [isUpdatingRole, setIsUpdatingRole] = useState(false);
	const [roleMessage, setRoleMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
	const [recentActivity, setRecentActivity] = useState<any[]>([]);
	const [isLoadingActivity, setIsLoadingActivity] = useState(true);
	const [activityType, setActivityType] = useState<'created' | 'viewed'>('created');

	const handleSave = async () => {
		// TODO: Implement profile update API
		setIsEditing(false);
	};

	const handleRoleChange = async (newRole: 'visitor' | 'author') => {
		if (newRole === selectedRole) return;

		setIsUpdatingRole(true);
		setRoleMessage(null);

		try {
			const response = await fetch('/api/user/update-role', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ role: newRole }),
			});

			const data = await response.json();

			if (response.ok) {
				setSelectedRole(newRole);
				setRoleMessage({ 
					type: 'success', 
					text: data.message || 'Role updated successfully! Please sign out and sign in again.' 
				});
			} else {
				setRoleMessage({ 
					type: 'error', 
					text: data.error || 'Failed to update role' 
				});
			}
		} catch (error) {
			setRoleMessage({ 
				type: 'error', 
				text: 'An error occurred while updating role' 
			});
		} finally {
			setIsUpdatingRole(false);
		}
	};

	const handleSignOut = () => {
		signOut({ callbackUrl: "/profile" });
	};

	const formatDate = (dateString?: string) => {
		if (!dateString) return "Recently joined";
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
	};

	const getRelativeTime = (dateString: string) => {
		const now = new Date();
		const date = new Date(dateString);
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMins < 1) return 'Just now';
		if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
		if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
		if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
		return formatDate(dateString);
	};

	useEffect(() => {
		const fetchRecentActivity = async () => {
			try {
				const response = await fetch('/api/user/recent-activity');
				const data = await response.json();
				
				if (data.success) {
					setRecentActivity(data.activities);
					setActivityType(data.type);
				}
			} catch (error) {
				console.error('Error fetching recent activity:', error);
			} finally {
				setIsLoadingActivity(false);
			}
		};

		fetchRecentActivity();
	}, []);

	return (
		<div className={styles.container}>
			<div className={styles.profileCard}>
				{/* Header */}
				<div className={styles.header}>
					<button
						onClick={handleSignOut}
						className={styles.signOutButton}
					>
						<LogOut size={18} />
						Sign Out
					</button>
				</div>

				{/* Profile Content */}
				<div className={styles.content}>
					{/* Avatar */}
					<div className={styles.avatarSection}>
						<div className={styles.avatarContainer}>
							<div className={styles.avatar}>
								{user.avatar ? (
									<img
										src={user.avatar}
										alt={user.name}
										className={styles.avatarImage}
									/>
								) : (
									<div className={styles.avatarPlaceholder}>
										{user.name.charAt(0).toUpperCase()}
									</div>
								)}
							</div>
							<button className={styles.cameraButton}>
								<Camera size={18} />
							</button>
						</div>
					</div>

					{/* Profile Info */}
					<div className={styles.profileInfo}>
						{isEditing ? (
							<div className={styles.editForm}>
								<input
									type="text"
									value={formData.name}
									onChange={(e) => setFormData({ ...formData, name: e.target.value })}
									className={styles.nameInput}
									placeholder="Your name"
								/>
								<textarea
									value={formData.bio}
									onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
									placeholder="Tell us about yourself..."
									className={styles.bioTextarea}
									rows={3}
								/>
								<div className={styles.editButtons}>
									<button
										onClick={handleSave}
										className={styles.saveButton}
									>
										<Save size={18} /> Save Changes
									</button>
									<button
										onClick={() => setIsEditing(false)}
										className={styles.cancelButton}
									>
										<X size={18} /> Cancel
									</button>
								</div>
							</div>
						) : (
							<div className={styles.displayInfo}>
								<h1 className={styles.userName}>{user.name}</h1>
								<p className={styles.userBio}>{user.bio || "No bio added yet"}</p>
								<button
									onClick={() => setIsEditing(true)}
									className={styles.editButton}
								>
									<Edit size={18} /> Edit Profile
								</button>
							</div>
						)}
					</div>

					{/* Profile Stats */}
					<div className={styles.statsGrid}>
						<div className={styles.statCard}>
							<div className={styles.statIcon}><Mail size={32} /></div>
							<h3 className={styles.statTitle}>Email</h3>
							<p className={styles.statValue}>{user.email}</p>
						</div>

						<div className={styles.statCard}>
							<div className={styles.statIcon}><Calendar size={32} /></div>
							<h3 className={styles.statTitle}>Member Since</h3>
							<p className={styles.statValue}>{formatDate(user.createdAt)}</p>
						</div>

						<div className={styles.statCard}>
							<div className={styles.statIcon}><UserCircle size={32} /></div>
							<h3 className={styles.statTitle}>Role</h3>
							<div className={styles.roleSelector}>
								<select 
									value={selectedRole}
									onChange={(e) => handleRoleChange(e.target.value as 'visitor' | 'author')}
									className={styles.roleDropdown}
									disabled={isUpdatingRole}
								>
									<option value="visitor">Visitor</option>
									<option value="author">Author</option>
								</select>
								{roleMessage && (
									<p className={styles[`roleMessage${roleMessage.type === 'success' ? 'Success' : 'Error'}`]}>
										{roleMessage.text}
									</p>
								)}
							</div>
						</div>
					</div>

					{/* Quick Actions */}
					<div className={styles.quickActions}>
						<h2 className={styles.activityTitle}>Quick Actions</h2>
						<div className={styles.actionButtons}>
							<a href="/my-blogs" className={styles.actionButton}>
								<BookOpen size={20} /> My Blog Posts
							</a>
							<a href="/create" className={styles.actionButton}>
								<PenLine size={20} /> Create New Blog
							</a>
							<a href="/library" className={styles.actionButton}>
								<Search size={20} /> Browse Library
							</a>
						</div>
					</div>

					{/* Recent Activity */}
					<div className={styles.activitySection}>
						<h2 className={styles.activityTitle}>
							{activityType === 'created' ? 'Recent Activity' : 'Reading History'}
						</h2>
						{isLoadingActivity ? (
							<div className={styles.activityCard}>
								<p className={styles.activityMessage}>Loading...</p>
							</div>
						) : recentActivity.length === 0 ? (
							<div className={styles.activityCard}>
								<p className={styles.activityMessage}>No recent activity</p>
								<p className={styles.activitySubtext}>
									{activityType === 'created' 
										? 'Start creating blogs to see your activity here' 
										: 'Start reading blogs to see your history here'}
								</p>
							</div>
						) : (
							<div className={styles.activityList}>
								{recentActivity.map((activity, index) => (
									<a 
										key={`${activity.slug}-${index}`} 
										href={`/blog/${activity.slug}`}
										className={styles.activityItem}
									>
										<div className={styles.activityHeader}>
											<h3 className={styles.activityItemTitle}>{activity.title}</h3>
											{activityType === 'created' && (
												<span className={styles.activityStatus} data-status={activity.status}>
													{activity.status}
												</span>
											)}
										</div>
										<div className={styles.activityMeta}>
											<div className={styles.activityMetaItem}>
												<Clock size={14} />
												<span>
													{activityType === 'created' 
														? `Updated ${getRelativeTime(activity.updated_at)}`
														: `Read ${getRelativeTime(activity.viewed_at || activity.updated_at)}`}
												</span>
											</div>
											<div className={styles.activityMetaItem}>
												<Eye size={14} />
												<span>{activity.views} views</span>
											</div>
										</div>
									</a>
								))}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
