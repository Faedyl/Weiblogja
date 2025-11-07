"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
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
	});

	const router = useRouter();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		setError("");

		try {
			const result = await signIn("credentials", {
				email: formData.email,
				password: formData.password,
				name: formData.name,
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
		setFormData({ email: "", password: "", name: "" });
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
							<div className={styles.inputGroup}>
								<div className={styles.inputContainer}>
									<span className={styles.inputIcon}>👤</span>
									<input
										type="text"
										placeholder="Full Name"
										value={formData.name}
										onChange={(e) => setFormData({ ...formData, name: e.target.value })}
										className={styles.input}
										required={!isLogin}
									/>
								</div>
							</div>
						)}

						<div className={styles.inputGroup}>
							<div className={styles.inputContainer}>
								<span className={styles.inputIcon}>📧</span>
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
								<span className={styles.inputIcon}>🔒</span>
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
									{showPassword ? "👁️" : "🙈"}
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
									{isLogin ? "🔐 Sign In" : "👤 Create Account"}
								</>
							)}
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
