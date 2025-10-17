import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import ProfileView from "@/components/ProfileView";
import LoginView from "@/components/LoginView";

export default async function ProfilePage() {
	const user = await getCurrentUser();

	if (!user) {
		// Show login/register interface styled as profile page
		return <LoginView />;
	}

	// Show actual profile
	return <ProfileView user={user} />;
}
