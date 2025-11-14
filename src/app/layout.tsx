import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "./components/sidebar/sidebar"
import Navbar from "./components/navbar/navbar"
import { AuthProvider } from "@/contexts/AuthContext"

import { SessionProvider } from "next-auth/react"
const geistSans = Geist({
        variable: "--font-geist-sans",
        subsets: ["latin"],
});

const geistMono = Geist_Mono({
        variable: "--font-geist-mono",
        subsets: ["latin"],
});

export const metadata: Metadata = {
        title: "Weiblogja",
        description: "Web blog with Implementation Generative AI",
};

export default function RootLayout({
        children,
}: Readonly<{
        children: React.ReactNode;
}>) {
        return (
                <html lang="en">
                        <body className={`${geistSans.variable} ${geistMono.variable}`}>
                                <SessionProvider>
                                        <AuthProvider>
                                                <Navbar />
                                                <div className="app-container">
                                                        <Sidebar />
                                                        <main className="main-content">
                                                                {children}
                                                        </main>
                                                </div>
                                        </AuthProvider>
                                </SessionProvider>                        </body>
                </html>
        );
}
