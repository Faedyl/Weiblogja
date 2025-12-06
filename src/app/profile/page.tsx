import { getCurrentUser } from "@/lib/auth";
import AuthForm from "@/app/components/login/AuthForm";
import ProfileView from "@/app/components/profile/ProfileView";
import styles from "@/app/page.module.css"

export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
	const user = await getCurrentUser();

	if (!user) {
		// Show combined login/register interface
		return <AuthForm mode="login" />;
	}

	// Show actual profile
	return (
		<div className={styles.DivContainer}>
			<ProfileView user={user} />

		</div>
	)
}
