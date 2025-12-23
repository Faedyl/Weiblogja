// Email service using Resend (Vercel-friendly) or fallback to nodemailer
// For Vercel deployment, use Resend: npm install resend

interface EmailOptions {
	to: string;
	subject: string;
	html: string;
}

export async function sendEmail({ to, subject, html }: EmailOptions): Promise<boolean> {
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

export function generateOTP(): string {
	return Math.floor(100000 + Math.random() * 900000).toString();
}

export function generateOTPEmailHTML(name: string, otp: string): string {
	return `
<!DOCTYPE html>
<html>
<head>
	<style>
		body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
		.container { max-width: 600px; margin: 0 auto; padding: 20px; }
		.header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
		.content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
		.otp-box { background: white; border: 2px solid #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
		.otp-code { font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #667eea; }
		.footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
	</style>
</head>
<body>
	<div class="container">
		<div class="header">
			<h1>Email Verification</h1>
		</div>
		<div class="content">
			<p>Hello ${name},</p>
			<p>Thank you for registering! Please use the following One-Time Password (OTP) to verify your email address:</p>
			<div class="otp-box">
				<div class="otp-code">${otp}</div>
			</div>
			<p><strong>This code will expire in 10 minutes.</strong></p>
			<p>If you didn't request this verification, please ignore this email.</p>
		</div>
		<div class="footer">
			<p>© ${new Date().getFullYear()} Weiblogja. All rights reserved.</p>
		</div>
	</div>
</body>
</html>
	`;
}
