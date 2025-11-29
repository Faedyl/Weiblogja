import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/api/auth/[...nextauth]/route";
import { getUserByEmail, updateUser } from "@/lib/db/users";

export async function POST(request: NextRequest) {
	try {
		const session = await auth();
		
		if (!session?.user?.email) {
			return NextResponse.json(
				{ error: "Unauthorized" },
				{ status: 401 }
			);
		}

		const { role } = await request.json();

		if (!role || (role !== "visitor" && role !== "author")) {
			return NextResponse.json(
				{ error: "Invalid role. Must be 'visitor' or 'author'" },
				{ status: 400 }
			);
		}

		const user = await getUserByEmail(session.user.email);
		
		if (!user) {
			return NextResponse.json(
				{ error: "User not found" },
				{ status: 404 }
			);
		}

		const updatedUser = await updateUser(session.user.email, {
			...user,
			role
		});

		if (!updatedUser) {
			return NextResponse.json(
				{ error: "Failed to update user role" },
				{ status: 500 }
			);
		}

		return NextResponse.json({
			success: true,
			role: updatedUser.role,
			message: "Role updated successfully. Please sign out and sign in again for changes to take effect."
		});
	} catch (error) {
		console.error("Error updating user role:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
