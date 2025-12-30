import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import { getUserByEmail, createUser, verifyPassword, updateUser } from "@/lib/db/users"
import { logger } from "@/lib/logger"

export const { handlers, auth, signIn, signOut } = NextAuth({
        providers: [
                Google({
                        clientId: process.env.GOOGLE_CLIENT_ID!,
                        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
                        authorization: {
                                params: {
                                        prompt: "consent",
                                        access_type: "offline",
                                        response_type: "code"
                                }
                        }
                }),
                Credentials({
                        name: "credentials",
                        credentials: {
                                email: { label: "Email", type: "email", placeholder: "your@email.com" },
                                password: { label: "Password", type: "password" },
                                name: { label: "Name", type: "text", placeholder: "Your full name" },
                                institution: { label: "Institution", type: "text" },
                                department: { label: "Department", type: "text" },
                                orcid: { label: "ORCID", type: "text" },
                                isRegistering: { label: "Is Registering", type: "hidden" },
                        },
                        async authorize(credentials) {
                                if (!credentials?.email || !credentials?.password) {
                                        throw new Error("Please provide email and password")
                                }

                                const isRegistering = credentials.isRegistering === "true"

                                if (isRegistering) {
                                        // Registration flow
                                        if (!credentials.name) {
                                                throw new Error("Name is required for registration")
                                        }

                                        // Validate institution is provided (required for author verification)
                                        if (!credentials.institution) {
                                                throw new Error("Institution/University is required for registration")
                                        }

                                        // Check if user already exists
                                        const existingUser = await getUserByEmail(credentials.email as string)
                                        if (existingUser) {
                                                // Allow registration if user exists with pending verification status
                                                // This handles cases where user is completing registration after initial form submission
                                                if (existingUser.verificationStatus === 'pending') {
                                                        // Update the pending user's information
                                                        // We need to hash the password separately since updateUser doesn't handle hashing
                                                        const bcrypt = await import('bcryptjs');
                                                        const hashedPassword = await bcrypt.hash(credentials.password as string, 12);

                                                        const updatedUser = await updateUser(credentials.email as string, {
                                                                name: credentials.name as string,
                                                                password: hashedPassword,
                                                                institution: credentials.institution as string,
                                                                department: credentials.department as string,
                                                                orcid: credentials.orcid as string,
                                                                verificationStatus: 'pending',
                                                                updatedAt: new Date().toISOString()
                                                        });

                                                        // Fetch the updated user to return complete information
                                                        const finalUser = await getUserByEmail(credentials.email as string);
                                                        if (!finalUser) {
                                                                throw new Error("Failed to update user");
                                                        }

                                                        return {
                                                                id: finalUser.email,
                                                                email: finalUser.email,
                                                                name: finalUser.name,
                                                                role: finalUser.role || 'visitor',
                                                                institution: finalUser.institution,
                                                                verificationStatus: finalUser.verificationStatus
                                                        };
                                                } else {
                                                        throw new Error("User already exists with this email")
                                                }
                                        }

                                        // Create new user with pending verification status
                                        const newUser = await createUser(
                                                credentials.email as string,
                                                credentials.name as string,
                                                credentials.password as string,
                                                {
                                                        institution: credentials.institution as string,
                                                        department: credentials.department as string,
                                                        orcid: credentials.orcid as string,
                                                        verificationStatus: 'pending'  // Set verification status to pending
                                                }
                                        )

                                        logger.debug('📝 New user registered:', {
                                                email: newUser.email,
                                                role: newUser.role,
                                                institution: newUser.institution,
                                                verificationStatus: newUser.verificationStatus
                                        })

                                        return {
                                                id: newUser.email,
                                                email: newUser.email,
                                                name: newUser.name,
                                                role: newUser.role || 'visitor',
                                                institution: newUser.institution,
                                                verificationStatus: newUser.verificationStatus
                                        }
                                } else {
                                        // Login flow
                                        try {
                                                const user = await getUserByEmail(credentials.email as string)

                                                if (!user) {
                                                        // Return null for invalid credentials
                                                        // This will result in CredentialsSignin error
                                                        return null
                                                }

                                                // Check if user has verified their email
                                                if (user.verificationStatus !== 'verified') {
                                                        // Return null for unverified users
                                                        // This will result in CredentialsSignin error
                                                        return null
                                                }

                                                const isValid = await verifyPassword(credentials.password as string, user.password)

                                                if (!isValid) {
                                                        // Return null for invalid password
                                                        // This will result in CredentialsSignin error
                                                        return null
                                                }

                                                logger.debug('🔐 User logged in:', { email: user.email, role: user.role })

                                                return {
                                                        id: user.email,
                                                        email: user.email,
                                                        name: user.name,
                                                        role: user.role || 'visitor' // Add role here
                                                }
                                        } catch (error) {
                                                logger.error('Error in authorize function:', error)
                                                // Return null for any unexpected errors
                                                // This will result in CredentialsSignin error
                                                return null
                                        }
                                }
                        },
                }),
        ],
        session: {
                strategy: "jwt",
        },
        pages: {
                signIn: "/profile",
        },
        callbacks: {
                async signIn({ user, account, profile }) {
                        if (account?.provider === "google") {
                                try {
                                        const email = user.email!
                                        let existingUser = await getUserByEmail(email)
                                        
                                        if (!existingUser) {
                                                // Create new user from Google profile
                                                await createUser(
                                                        email,
                                                        user.name || profile?.name || "User",
                                                        Math.random().toString(36).slice(-12), // Random password for OAuth users
                                                        {
                                                                institution: (profile as any)?.hd || "" // Google Workspace domain if available
                                                        }
                                                )
                                                logger.debug('📝 New user registered via Google OAuth:', { email })
                                        }
                                        return true
                                } catch (error) {
                                        logger.error('Google OAuth error:', error)
                                        return false
                                }
                        }
                        return true
                },
                async jwt({ token, user, account }) {
                        if (user) {
                                token.id = user.id
                                token.email = user.email
                                token.name = user.name
                                
                                // Fetch role from database for OAuth users
                                if (account?.provider === "google") {
                                        const dbUser = await getUserByEmail(user.email!)
                                        token.role = dbUser?.role || 'visitor'
                                } else {
                                        token.role = (user as any).role
                                }
                                logger.debug('🎫 JWT token created with role:', token.role)
                        }
                        return token
                },
                async session({ session, token }) {
                        if (session.user && token) {
                                session.user.id = token.id as string
                                session.user.email = token.email as string
                                session.user.name = token.name as string;
                                (session.user as any).role = token.role
                                logger.debug('✅ Session created with role:', (session.user as any).role)
                        }
                        return session
                },
        },
})

export const { GET, POST } = handlers
