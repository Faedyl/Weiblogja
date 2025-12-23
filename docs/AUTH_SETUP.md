# Authentication Setup Guide

This project now supports three authentication methods:
1. **Email/Password with OTP verification**
2. **Google OAuth (including institutional accounts)**
3. **Traditional Email/Password (legacy)**

## 🚀 Features Implemented

### 1. OTP Email Verification
- 6-digit OTP code sent to user's email
- 10-minute expiration
- Max 5 verification attempts
- Automatic cleanup using DynamoDB TTL

### 2. Google OAuth
- Standard Google Sign-In
- Support for institutional Google accounts (@university.edu, etc.)
- Automatic user creation on first sign-in
- Domain restriction support (optional)

## 📋 Environment Variables Required

Add these to your `.env.local` file:

```bash
# NextAuth Configuration
NEXTAUTH_SECRET=your-secret-here  # Generate with: openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000  # Change to your domain in production

# Google OAuth (Required for Google Sign-In)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
# Optional: Restrict to specific domain (e.g., university.edu)
GOOGLE_HD=youruniversity.edu

# Email Service - Choose ONE option:

## Option 1: Resend (Recommended for Vercel) - https://resend.com
RESEND_API_KEY=re_xxxxxxxxxxxx
EMAIL_FROM=noreply@yourdomain.com

## Option 2: SMTP (AWS SES, SendGrid, Gmail, etc.)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@yourdomain.com
```

## 🔧 Setup Instructions

### 1. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure OAuth consent screen
6. Add Authorized redirect URIs:
   - Development: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://yourdomain.com/api/auth/callback/google`
7. Copy Client ID and Client Secret to `.env.local`

### 2. Email Service Setup

#### Option A: Resend (Easiest for Vercel)

1. Sign up at [resend.com](https://resend.com)
2. Verify your domain or use their test domain
3. Get API key from dashboard
4. Add to `.env.local`:
   ```bash
   RESEND_API_KEY=re_xxxxxxxxxxxx
   EMAIL_FROM=noreply@yourdomain.com
   ```

#### Option B: Gmail SMTP

1. Enable 2-factor authentication on your Google account
2. Generate an App Password: [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
3. Add to `.env.local`:
   ```bash
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   SMTP_PASSWORD=your-app-password
   EMAIL_FROM=your-email@gmail.com
   ```

#### Option C: AWS SES

1. Set up AWS SES and verify your domain
2. Create SMTP credentials in SES console
3. Add to `.env.local`:
   ```bash
   SMTP_HOST=email-smtp.us-east-1.amazonaws.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-ses-smtp-username
   SMTP_PASSWORD=your-ses-smtp-password
   EMAIL_FROM=noreply@yourdomain.com
   ```

### 3. DynamoDB Setup

No additional DynamoDB setup required! The OTP records use the same table as users with a different SK (Sort Key):
- User records: `PK: USER#email, SK: PROFILE#email`
- OTP records: `PK: USER#email, SK: OTP`

**Important**: Enable TTL on your DynamoDB table:
1. Go to DynamoDB console
2. Select your users table
3. Go to **Additional settings** → **Time to Live (TTL)**
4. Enable TTL with attribute name: `ttl`

This automatically deletes expired OTP records!

## 🎨 User Flow

### Registration with OTP
1. User fills registration form (name, email, password, institution)
2. Clicks "Send Verification Code"
3. Receives 6-digit code via email
4. Enters code in verification screen
5. Account created and logged in automatically

### Google Sign-In
1. User clicks "Sign in with Google" button
2. Redirected to Google OAuth consent screen
3. After authorization, redirected back to app
4. If new user, account created automatically
5. Logged in and redirected to profile

## 🔒 Security Features

- **OTP Expiration**: Codes expire after 10 minutes
- **Rate Limiting**: Max 5 verification attempts per OTP
- **Automatic Cleanup**: DynamoDB TTL removes expired OTP records
- **Password Hashing**: bcrypt with 12 rounds
- **HTTPS Only**: Secure cookies in production
- **Domain Restriction**: Optional Google Workspace domain restriction

## 🚀 Deployment to Vercel

1. Push your code to GitHub
2. Connect repository to Vercel
3. Add all environment variables in Vercel dashboard
4. Deploy!

**Important**: In Vercel environment variables, set:
```bash
NEXTAUTH_URL=https://yourdomain.vercel.app
```

## 📱 Testing

### Development Mode
If no email service is configured, OTP codes are logged to console:
```bash
📧 Email (not sent - configure email service):
To: user@example.com
Subject: Verify Your Email - Weiblogja
Content: [HTML with OTP code]
```

### Production Testing
1. Use a test email address
2. Check spam folder if OTP doesn't arrive
3. Monitor Vercel logs for any errors

## 🐛 Troubleshooting

### "Failed to send verification email"
- Check email service credentials
- Verify EMAIL_FROM domain is verified (for Resend/SES)
- Check Vercel function logs

### "Invalid OTP"
- Code may have expired (10 min limit)
- Check for typos
- Request new code

### Google Sign-In not working
- Verify redirect URI matches exactly (including http/https)
- Check Google Cloud Console for errors
- Ensure OAuth consent screen is configured

### OTP records not deleting
- Enable TTL on DynamoDB table with attribute `ttl`
- Wait up to 48 hours for TTL to activate

## 📚 API Endpoints

### POST `/api/auth/send-otp`
Send OTP verification code
```json
{
  "email": "user@example.com",
  "name": "John Doe"
}
```

### POST `/api/auth/verify-otp`
Verify OTP code
```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

### NextAuth Endpoints
- `GET/POST /api/auth/signin` - Sign in page
- `GET /api/auth/signout` - Sign out
- `GET /api/auth/session` - Get session
- `GET /api/auth/callback/google` - Google OAuth callback

## 🎯 Next Steps

Optional enhancements you might want to add:
- [ ] Rate limiting on OTP sends (prevent spam)
- [ ] Email templates customization
- [ ] SMS OTP alternative
- [ ] Social providers (GitHub, LinkedIn)
- [ ] Two-factor authentication
- [ ] Email verification for existing users

## 📞 Support

For issues or questions:
1. Check Vercel function logs
2. Review DynamoDB CloudWatch logs
3. Test email service independently
4. Verify all environment variables are set correctly
