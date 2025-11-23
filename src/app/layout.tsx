import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "next-auth/react"
import ClientLayout from "./ClientLayout";

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
                                        <ClientLayout>
                                                {children}
                                        </ClientLayout>
                                </SessionProvider>
                        </body>
                </html>
        );
}
