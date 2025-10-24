import { auth } from "@/app/api/auth/[...nextauth]/route"

export async function getCurrentUser() {
	try {
		const session = await auth()
		return session?.user || null
	} catch (error) {
		console.error("Error getting current user:", error)
		return null
	}
}

export async function requireAuth() {
	const user = await getCurrentUser()
	if (!user) {
		throw new Error("Unauthorized")
	}
	return user
}
