import { getCurrentUser } from "@/lib/auth";
import AuthForm from "@/app/components/login/AuthForm";
import ProfileView from "@/app/components/profile/ProfileView";
export default async function ProfilePage() {
	const user = await getCurrentUser();

	if (!user) {
		// Show combined login/register interface
		return <AuthForm mode="login" />;
	}

	// Show actual profile
	return <ProfileView user={user} />;
}
