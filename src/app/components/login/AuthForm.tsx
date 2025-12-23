"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation"
import { useAuth } from '@/contexts/AuthContext';
import { Mail, EyeClosed, Eye } from 'lucide-react'
import styles from "./AuthForm.module.css";
import pageStyle from "@/app/page.module.css"
interface AuthFormProps {
	mode?: "login" | "register";
}

export default function AuthForm({ mode = "login" }: AuthFormProps) {
	const [isLogin, setIsLogin] = useState(mode === "login");
	const [showPassword, setShowPassword] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");
	const [formData, setFormData] = useState({
		email: "",
		password: "",
		name: "",
		institution: "",
		department: "",
		orcid: "",
	});

	const router = useRouter();

	const handleGoogleSignIn = async () => {
		setIsLoading(true);
		setError("");
		try {
			await signIn("google", {
				callbackUrl: "/profile",
				redirect: true,
			});
		} catch (err) {
			setError("Failed to sign in with Google");
			setIsLoading(false);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		setError("");

		try {
			const result = await signIn("credentials", {
				email: formData.email,
				password: formData.password,
				name: formData.name,
				institution: formData.institution,
				department: formData.department,
				orcid: formData.orcid,
				isRegistering: (!isLogin).toString(),
				redirect: false,
			});

			if (result?.error) {
				setError(result.error);
			} else if (result?.ok) {
				router.push("/profile");
				router.refresh();
			}
		} catch (err) {
			setError("An unexpected error occurred");
		} finally {
			setIsLoading(false);
		}
	};

	const toggleMode = () => {
		setIsLogin(!isLogin);
		setError("");
		setFormData({ 
			email: "", 
			password: "", 
			name: "",
			institution: "",
			department: "",
			orcid: "",
		});
	};

	return (
		<div className={pageStyle.DivContainer}>
			<div className={styles.formCard}>
				<div className={styles.header}>
					<h1 className={styles.title}>
						{isLogin ? "Sign In" : "Create Account"}
					</h1>
					<p className={styles.subtitle}>
						{isLogin
							? "Sign in to access your profile"
							: "Join our community today"
						}
					</p>
				</div>

				{error && (
					<div className={styles.errorContainer}>
						<p className={styles.errorText}>{error}</p>
					</div>
				)}
				<div className={styles.container}>
					<form onSubmit={handleSubmit} className={styles.form}>
						{!isLogin && (
							<>
								<div className={styles.inputGroup}>
									<div className={styles.inputContainer}>
										<input
											type="text"
											placeholder="Full Name (as it appears on publications)"
											value={formData.name}
											onChange={(e) => setFormData({ ...formData, name: e.target.value })}
											className={styles.input}
											required={!isLogin}
										/>
									</div>
								</div>

								<div className={styles.inputGroup}>
									<div className={styles.inputContainer}>
										<input
											type="text"
											placeholder="Institution/University *"
											value={formData.institution}
											onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
											className={styles.input}
											required={!isLogin}
										/>
									</div>
								</div>

								<div className={styles.inputGroup}>
									<div className={styles.inputContainer}>
										<input
											type="text"
											placeholder="Department/Field (optional)"
											value={formData.department}
											onChange={(e) => setFormData({ ...formData, department: e.target.value })}
											className={styles.input}
										/>
									</div>
								</div>

								<div className={styles.inputGroup}>
									<div className={styles.inputContainer}>
										<input
											type="text"
											placeholder="ORCID iD (optional, e.g., 0000-0002-1234-5678)"
											value={formData.orcid}
											onChange={(e) => setFormData({ ...formData, orcid: e.target.value })}
											className={styles.input}
										/>
									</div>
								</div>
							</>
						)}

						<div className={styles.inputGroup}>
							<div className={styles.inputContainer}>
								<input
									type="email"
									placeholder="Email Address"
									value={formData.email}
									onChange={(e) => setFormData({ ...formData, email: e.target.value })}
									className={styles.input}
									required
								/>
							</div>
						</div>

						<div className={styles.inputGroup}>
							<div className={styles.inputContainer}>
								<input
									type={showPassword ? "text" : "password"}
									placeholder="Password"
									value={formData.password}
									onChange={(e) => setFormData({ ...formData, password: e.target.value })}
									className={styles.input}
									required
								/>
								<button
									type="button"
									onClick={() => setShowPassword(!showPassword)}
									className={styles.passwordToggle}
								>
									{showPassword ? <Eye /> : <EyeClosed />}
								</button>
							</div>
						</div>

						<button
							type="submit"
							disabled={isLoading}
							className={`${styles.submitButton} ${isLoading ? styles.loading : ""}`}
						>
							{isLoading ? (
								<div className={styles.spinner}></div>
							) : (
								<>
									{isLogin ? "Sign In" : "Create Account"}
								</>
							)}
						</button>
						
						<div className={styles.divider}>
							<span className={styles.dividerText}>OR</span>
						</div>
						
						<button
							type="button"
							onClick={handleGoogleSignIn}
							disabled={isLoading}
							className={styles.googleButton}
						>
							<svg className={styles.googleIcon} viewBox="0 0 24 24" width="20" height="20">
								<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
								<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
								<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
								<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
							</svg>
							{isLogin ? "Sign in with Google" : "Sign up with Google"}
						</button>
					</form>

				</div>

				<div className={styles.footer}>
					<p className={styles.footerText}>
						{isLogin ? "Don't have an account?" : "Already have an account?"}
						<button
							onClick={toggleMode}
							className={styles.toggleButton}
						>
							{isLogin ? "Sign up" : "Sign in"}
						</button>
					</p>
				</div>
			</div>
		</div>
	);
}
