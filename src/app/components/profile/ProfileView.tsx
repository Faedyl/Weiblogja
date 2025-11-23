"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Mail, Calendar, UserCircle, LogOut, Camera, Save, X, Edit, BookOpen, PenLine, Search } from "lucide-react";
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
	};
}

export default function ProfileView({ user }: ProfileViewProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [formData, setFormData] = useState({
		name: user.name,
		bio: user.bio || "",
	});

	const handleSave = async () => {
		// TODO: Implement profile update API
		setIsEditing(false);
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
							<p className={styles.statValue}>Author</p>
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
						<h2 className={styles.activityTitle}>Recent Activity</h2>
						<div className={styles.activityCard}>
							<p className={styles.activityMessage}>No recent activity</p>
							<p className={styles.activitySubtext}>Start creating blogs to see your activity here</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
