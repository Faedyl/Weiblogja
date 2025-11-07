"use client"
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Search, Menu, X, PlusCircle, User, Home, LibraryBig } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import styles from './navbar.module.css'
import SearchBar from '@/app/components/searchbar/searchbar'

export default function Navbar() {
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

				{/* Mobile Menu Button */}
				<button
					className={styles.mobileMenuButton}
					onClick={toggleMenu}
					aria-label="Toggle menu"
				>
					{isMenuOpen ? <X size={24} /> : <Menu size={24} />}
				</button>
			</div>

			{/* Mobile Menu */}
			{isMenuOpen && (
				<div className={styles.mobileMenu}>
					{/* Mobile Search */}
					<SearchBar
						onResultClick={handleSearchResultClick}
						className={styles.mobileSearchForm}
						maxResults={4}
					/>
					{/* Mobile Links */}
					<div className={styles.mobileNavLinks}>
						<Link
							href="/"
							className={`${styles.mobileNavLink} ${pathname === '/' ? styles.active : ''}`}
							onClick={() => setIsMenuOpen(false)}
						>
							<Home size={20} />
							Home
						</Link>
						<Link
							href="/library"
							className={`${styles.mobileNavLink} ${pathname === '/library' ? styles.active : ''}`}
							onClick={() => setIsMenuOpen(false)}
						>
							<LibraryBig size={20} />
							Library
						</Link>
						<Link
							href="/create"
							className={`${styles.mobileNavLink} ${pathname === '/create' ? styles.active : ''}`}
							onClick={() => setIsMenuOpen(false)}
						>
							<PlusCircle size={20} />
							Create Blog
						</Link>
						<Link
							href="/profile"
							className={`${styles.mobileNavLink} ${pathname === '/profile' ? styles.active : ''}`}
							onClick={() => setIsMenuOpen(false)}
						>
							<User size={20} />
							Profile
						</Link>
					</div>
				</div>
			)}
		</nav>
	)
}
