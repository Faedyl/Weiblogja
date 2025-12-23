import { NextRequest, NextResponse } from "next/server";
import { sendEmail, generateOTP, generateOTPEmailHTML } from "@/lib/email";
import { storeOTP } from "@/lib/db/otp";
import { getUserByEmail } from "@/lib/db/users";

export async function POST(request: NextRequest) {
	try {
		const { email, name } = await request.json();

		if (!email || !name) {
			return NextResponse.json(
				{ error: "Email and name are required" },
				{ status: 400 }
			);
		}

		// Check if email format is valid
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return NextResponse.json(
				{ error: "Invalid email format" },
				{ status: 400 }
			);
		}

		// Check if user already exists
		const existingUser = await getUserByEmail(email);
		if (existingUser) {
			return NextResponse.json(
				{ error: "User already exists with this email" },
				{ status: 409 }
			);
		}

		// Generate and store OTP
		const otp = generateOTP();
		await storeOTP(email, otp);

		// Send OTP email
		const emailSent = await sendEmail({
			to: email,
			subject: "Verify Your Email - Weiblogja",
			html: generateOTPEmailHTML(name, otp),
		});

		if (!emailSent) {
			return NextResponse.json(
				{ error: "Failed to send verification email. Please try again." },
				{ status: 500 }
			);
		}

		return NextResponse.json({
			success: true,
			message: "Verification code sent to your email",
		});
	} catch (error) {
		console.error("Error sending OTP:", error);
		return NextResponse.json(
			{ error: "Failed to send verification code" },
			{ status: 500 }
		);
	}
}
