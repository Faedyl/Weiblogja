import NextAuth, { AuthOptions, User, Session } from "next-auth";
import { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import { getUserByEmail, verifyPassword } from "@/lib/db/users";

export const authOptions: AuthOptions = {
	providers: [
		CredentialsProvider({
			name: "Credentials",
			credentials: {
				email: { label: "Email", type: "email", placeholder: "your@email.com" },
				password: { label: "Password", type: "password" },
			},
			async authorize(credentials): Promise<User | null> {
				if (!credentials?.email || !credentials?.password) {
					throw new Error("Please provide email and password");
				}

				const user = await getUserByEmail(credentials.email);

				if (!user) {
					throw new Error("No user found with this email");
				}

				const isValid = await verifyPassword(credentials.password, user.password);

				if (!isValid) {
					throw new Error("Invalid password");
				}

				return {
					id: user.email,
					email: user.email,
					name: user.name,
				};
			},
		}),
	],
	session: {
		strategy: "jwt",
	},
	pages: {
		signIn: "/login",
	},
	callbacks: {
		async jwt({ token, user }: { token: JWT; user: User | null }): Promise<JWT> {
			if (user) {
				token.id = user.id;
				token.email = user.email;
				token.name = user.name;
			}
			return token;
		},
		async session({ session, token }: { session: Session; token: JWT }): Promise<Session> {
			if (session.user) {
				session.user.id = token.id as string;
				session.user.email = token.email as string;
				session.user.name = token.name as string;
			}
			return session;
		},
	},
	secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
