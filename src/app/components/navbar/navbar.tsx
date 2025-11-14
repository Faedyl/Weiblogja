"use client"
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Search, Menu, X, PlusCircle, User, Home, LibraryBig } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import styles from './navbar.module.css'
import SearchBar from '@/app/components/searchbar/searchbar'

interface NavbarProps {
	onToggleSidebar?: () => void;
}

export default function Navbar({ onToggleSidebar }: NavbarProps) {
	const [isMenuOpen, setIsMenuOpen] = useState(false)
	const [searchQuery, setSearchQuery] = useState('')
	const pathname = usePathname()
	const router = useRouter()

	const handleSearchResultClick = (blog: any) => {
		router.push(`/blog/${blog.slug}`)
	}

	const toggleMenu = () => setIsMenuOpen(!isMenuOpen)

	return (
		<nav className={styles.navbar}>
			<div className={styles.navContainer}>
				<button
					className={styles.sidebarToggleButton}
					onClick={onToggleSidebar}
					aria-label="Toggle sidebar"
				>
					<Menu size={24} />
				</button>
				{/* Logo/Brand */}
				<Link href="/" className={styles.brand}>
					<Image src="/weiblogja.svg" alt="Brand Logo" width={66} height={65} />
					<span className={styles.brandText}>WEIBLOGJA</span>
				</Link>

				{/* Search Bar - Desktop */}
				<SearchBar
					onResultClick={handleSearchResultClick}
					className={styles.searchForm}
				/>
			</div>
		</nav>
	)
}
