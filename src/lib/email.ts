// Email service using Resend (Vercel-friendly) or fallback to nodemailer
// For Vercel deployment, use Resend: npm install resend

/**
 * Email options interface
 */
interface EmailOptions {
	to: string;
	subject: string;
	html: string;
}

/**
 * Email service class for sending various types of emails
 */
export class EmailService {
	/**
	 * Send an email using Resend, SMTP, or fall back to console logging
	 */
	static async sendEmail({ to, subject, html }: EmailOptions): Promise<boolean> {
		try {
			// Option 1: Using Resend (recommended for Vercel)
			if (process.env.RESEND_API_KEY) {
				const response = await fetch('https://api.resend.com/emails', {
					method: 'POST',
					headers: {
						'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						from: process.env.EMAIL_FROM || 'noreply@yourdomain.com',
						to,
						subject,
						html,
					}),
				});

				if (!response.ok) {
					console.error('Resend error:', await response.text());
					return false;
				}
				return true;
			}

			// Option 2: Using standard SMTP (AWS SES, SendGrid, etc.)
			if (process.env.SMTP_HOST) {
				const nodemailer = await import('nodemailer');

				const transporter = nodemailer.default.createTransport({
					host: process.env.SMTP_HOST,
					port: parseInt(process.env.SMTP_PORT || '587'),
					secure: process.env.SMTP_SECURE === 'true',
					auth: {
						user: process.env.SMTP_USER,
						pass: process.env.SMTP_PASSWORD,
					},
				});

				await transporter.sendMail({
					from: process.env.EMAIL_FROM || 'noreply@yourdomain.com',
					to,
					subject,
					html,
				});

				return true;
			}

			// Fallback: Log to console (development only)
			console.log('📧 Email (not sent - configure email service):');
			console.log('To:', to);
			console.log('Subject:', subject);
			console.log('Content:', html);
			return true;

		} catch (error) {
			console.error('Error sending email:', error);
			return false;
		}
	}

	/**
	 * Generate a random 6-digit OTP
	 */
	static generateOTP(): string {
		return Math.floor(100000 + Math.random() * 900000).toString();
	}

	/**
	 * Generate a beautifully styled OTP email template
	 */
	static generateOTPEmailHTML(name: string, otp: string): string {
		return `
<!DOCTYPE html>
<html>
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Verify Your Email</title>
	<style>
		body {
			margin: 0;
			padding: 0;
			font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
			background-color: #f4f7f6;
			color: #555555;
		}
		.container {
			max-width: 600px;
			margin: 0 auto;
			background-color: #ffffff;
			border-radius: 10px;
			box-shadow: 0 4px 12px rgba(0,0,0,0.1);
			overflow: hidden;
		}
		.header {
			background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
			color: white;
			padding: 30px 20px;
			text-align: center;
		}
		.header h1 {
			font-size: 28px;
			margin: 0;
			font-weight: 600;
		}
		.content {
			padding: 30px;
			background-color: #fff;
		}
		.content p {
			font-size: 16px;
			line-height: 1.6;
			margin-bottom: 20px;
		}
		.otp-box {
			background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
			border: 2px dashed #79a9f5;
			border-radius: 12px;
			padding: 25px;
			text-align: center;
			margin: 25px 0;
			box-shadow: 0 4px 8px rgba(0,0,0,0.05);
		}
		.otp-code {
			font-size: 36px;
			font-weight: bold;
			letter-spacing: 5px;
			color: #4f46e5;
			text-transform: uppercase;
			font-family: 'Courier New', monospace;
		}
		.expire-note {
			font-size: 14px;
			color: #7c3aed;
			font-weight: 500;
			margin-top: 15px;
		}
		.footer {
			background-color: #f9fafb;
			padding: 20px;
			text-align: center;
			border-top: 1px solid #e5e7eb;
			color: #6b7280;
			font-size: 13px;
		}
		.footer a {
			color: #4f46e5;
			text-decoration: none;
		}
		.button {
			display: inline-block;
			background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
			color: white !important;
			padding: 12px 24px;
			text-decoration: none;
			border-radius: 6px;
			font-weight: 500;
			margin: 20px 0;
			transition: transform 0.2s, box-shadow 0.2s;
		}
		.button:hover {
			transform: translateY(-2px);
			box-shadow: 0 6px 12px rgba(79, 70, 229, 0.2);
		}
		@media (max-width: 600px) {
			.container {
				border-radius: 0;
			}
			.content {
				padding: 20px;
			}
			.otp-code {
				font-size: 28px;
			}
		}
	</style>
</head>
<body>
	<div class="container">
		<div class="header">
			<h1>Verify Your Email</h1>
		</div>
		<div class="content">
			<p>Hello ${name},</p>
			<p>Thank you for registering with Weiblogja! Please use the following One-Time Password (OTP) to verify your email address:</p>

			<div class="otp-box">
				<div class="otp-code">${otp}</div>
				<div class="expire-note">This code will expire in 10 minutes</div>
			</div>

			<p>If you didn't request this verification, please ignore this email.</p>
			<p>Best regards,<br> The Weiblogja Team</p>
		</div>
		<div class="footer">
			<p>© ${new Date().getFullYear()} Weiblogja. All rights reserved.</p>
			<p>If you have any questions, feel free to <a href="mailto:support@weiblogja.com">contact us</a>.</p>
		</div>
	</div>
</body>
</html>
		`;
	}
}

// Export utility functions for direct use
export const sendEmail = EmailService.sendEmail;
export const generateOTP = EmailService.generateOTP;
export const generateOTPEmailHTML = EmailService.generateOTPEmailHTML;
