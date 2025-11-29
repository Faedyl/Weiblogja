import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { getUserByEmail, createUser, verifyPassword } from "@/lib/db/users"
import { logger } from "@/lib/logger"

export const { handlers, auth, signIn, signOut } = NextAuth({
        providers: [
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
                                                throw new Error("User already exists with this email")
                                        }

                                        // Create new user with enhanced profile
                                        const newUser = await createUser(
                                                credentials.email as string,
                                                credentials.name as string,
                                                credentials.password as string,
                                                {
                                                        institution: credentials.institution as string,
                                                        department: credentials.department as string,
                                                        orcid: credentials.orcid as string,
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
                                        const user = await getUserByEmail(credentials.email as string)

                                        if (!user) {
                                                throw new Error("No user found with this email")
                                        }

                                        const isValid = await verifyPassword(credentials.password as string, user.password)

                                        if (!isValid) {
                                                throw new Error("Invalid password")
                                        }

                                        logger.debug('🔐 User logged in:', { email: user.email, role: user.role })

                                        return {
                                                id: user.email,
                                                email: user.email,
                                                name: user.name,
                                                role: user.role || 'visitor' // Add role here
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
                error: "/profile",
        },
        callbacks: {
                async jwt({ token, user }) {
                        if (user) {
                                token.id = user.id
                                token.email = user.email
                                token.name = user.name
                                token.role = (user as any).role // Add role to JWT token
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
