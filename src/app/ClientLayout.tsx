"use client";

import { useState } from "react";
import Sidebar from "./components/sidebar/sidebar"
import Navbar from "./components/navbar/navbar"
import { AuthProvider } from "@/contexts/AuthContext"

export default function ClientLayout({
        children,
}: {
        children: React.ReactNode;
}) {
        const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

        const toggleSidebar = () => {
                setIsSidebarCollapsed(!isSidebarCollapsed);
        };

        return (
                <AuthProvider>
                        <Navbar onToggleSidebar={toggleSidebar} />
                        <div className="app-container">
                                <Sidebar isCollapsed={isSidebarCollapsed} />
                                <main className={`main-content ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
                                        {children}
                                </main>
                        </div>
                </AuthProvider>
        );
}
