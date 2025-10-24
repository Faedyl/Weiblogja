"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import styles from "./ProfileView.module.css";

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
		console.log("Saving profile:", formData);
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
						🚪 Sign Out
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
								📷
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
										💾 Save Changes
									</button>
									<button
										onClick={() => setIsEditing(false)}
										className={styles.cancelButton}
									>
										❌ Cancel
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
									✏️ Edit Profile
								</button>
							</div>
						)}
					</div>

					{/* Profile Stats */}
					<div className={styles.statsGrid}>
						<div className={styles.statCard}>
							<div className={styles.statIcon}>📧</div>
							<h3 className={styles.statTitle}>Email</h3>
							<p className={styles.statValue}>{user.email}</p>
						</div>

						<div className={styles.statCard}>
							<div className={styles.statIcon}>📅</div>
							<h3 className={styles.statTitle}>Member Since</h3>
							<p className={styles.statValue}>{formatDate(user.createdAt)}</p>
						</div>

						<div className={styles.statCard}>
							<div className={styles.statIcon}>🎭</div>
							<h3 className={styles.statTitle}>Role</h3>
							<p className={styles.statValue}>Author</p>
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
