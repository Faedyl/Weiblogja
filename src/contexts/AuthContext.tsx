'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import { logger } from '@/lib/logger'

interface User {
        id: string
        username: string
        email: string
        role: 'visitor' | 'author'
}

interface AuthContextType {
        user: User | null
        isAuthenticated: boolean
        isAuthor: boolean
        login: (userData: User) => void
        logout: () => void
        loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
        const { data: session, status } = useSession()
        const [user, setUser] = useState<User | null>(null)

        // Sync NextAuth session with our user state
        useEffect(() => {
                if (status === 'authenticated' && session?.user) {
                        const userData: User = {
                                id: session.user.id || 'user-' + Date.now(),
                                username: session.user.name || 'User',
                                email: session.user.email || '',
                                role: ((session.user as any).role as 'author' | 'visitor') || 'visitor'
                        }
                        logger.debug('✅ NextAuth session active:', userData)
                        setUser(userData)
                } else if (status === 'unauthenticated') {
                        logger.debug('ℹ️ No active session')
                        setUser(null)
                }
        }, [session, status])

        const login = (userData: User) => {
                logger.debug('🔐 Manual login called:', userData)
                setUser(userData)
        }

        const logout = () => {
                logger.debug('🚪 Logout called')
                setUser(null)
        }

        const isAuthenticated = !!user
        const isAuthor = user?.role === 'author'
        const loading = status === 'loading'

        const value = {
                user,
                isAuthenticated,
                isAuthor,
                login,
                logout,
                loading
        }

        // Log state changes
        useEffect(() => {
                logger.debug('🔄 Auth state:', {
                        status,
                        user: user?.username,
                        role: user?.role,
                        isAuthenticated,
                        isAuthor,
                        loading
                })
        }, [status, user, isAuthenticated, isAuthor, loading])

        return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
        const context = useContext(AuthContext)
        if (context === undefined) {
                throw new Error('useAuth must be used within an AuthProvider')
        }
        return context
}
