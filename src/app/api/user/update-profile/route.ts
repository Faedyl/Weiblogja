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

		const { name, bio } = await request.json();

		if (!name || name.trim().length === 0) {
			return NextResponse.json(
				{ error: "Name is required" },
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
			name: name.trim(),
			bio: bio?.trim() || "",
		});

		if (!updatedUser) {
			return NextResponse.json(
				{ error: "Failed to update user profile" },
				{ status: 500 }
			);
		}

		return NextResponse.json({
			success: true,
			user: {
				name: updatedUser.name,
				bio: updatedUser.bio,
			},
			message: "Profile updated successfully"
		});
	} catch (error) {
		console.error("Error updating user profile:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
