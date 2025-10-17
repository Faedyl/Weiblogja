"use client"
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Search, Menu, X, PlusCircle, User, Home, LibraryBig } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import styles from './navbar.module.css'

export default function Navbar() {
	const [isMenuOpen, setIsMenuOpen] = useState(false)
	const [searchQuery, setSearchQuery] = useState('')
	const pathname = usePathname()
	const router = useRouter()

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault()
		if (searchQuery.trim()) {
			// Navigate to search results page or filter current page
			router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
		}
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
				<form onSubmit={handleSearch} className={styles.searchForm}>
					<div className={styles.searchContainer}>
						<Search size={20} className={styles.searchIcon} />
						<input
							type="text"
							placeholder="Search blogs, topics, authors..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className={styles.searchInput}
						/>
					</div>
				</form>

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
					<form onSubmit={handleSearch} className={styles.mobileSearchForm}>
						<div className={styles.mobileSearchContainer}>
							<Search size={18} className={styles.searchIcon} />
							<input
								type="text"
								placeholder="Search blogs..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className={styles.mobileSearchInput}
							/>
						</div>
					</form>

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
