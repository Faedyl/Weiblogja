import { NextRequest, NextResponse } from "next/server";
import { verifyOTP } from "@/lib/db/otp";
import { verifyUserEmail } from "@/lib/db/users";

export async function POST(request: NextRequest) {
	try {
		const { email, otp } = await request.json();

		if (!email || !otp) {
			return NextResponse.json(
				{ error: "Email and OTP are required" },
				{ status: 400 }
			);
		}

		const result = await verifyOTP(email, otp);

		if (!result.valid) {
			return NextResponse.json(
				{ error: result.message },
				{ status: 400 }
			);
		}

		// Update user's verification status upon successful OTP verification
		await verifyUserEmail(email);

		return NextResponse.json({
			success: true,
			message: result.message,
		});
	} catch (error) {
		console.error("Error verifying OTP:", error);
		return NextResponse.json(
			{ error: "Failed to verify OTP" },
			{ status: 500 }
		);
	}
}
