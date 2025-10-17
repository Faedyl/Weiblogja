'use client';

import { useEffect, useState } from 'react'
import styles from './sidebar.module.css'
import { House, LibraryBig, UserRoundPen, PlusCircle } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

function Sidebar() {
	const pathname = usePathname();
	const [isMobile, setIsMobile] = useState(false);

	// Check if current path is a blog page
	const isBlogPage = pathname.startsWith('/blog/');

	// Check if device is mobile
	useEffect(() => {
		const checkMobile = () => {
			setIsMobile(window.innerWidth <= 768);
		};

		// Initial check
		checkMobile();

		// Listen for resize events
		window.addEventListener('resize', checkMobile);

		// Cleanup
		return () => window.removeEventListener('resize', checkMobile);
	}, []);

	// Hide sidebar on mobile when on blog pages
	if (isMobile && isBlogPage) {
		return null;
	}

	return (
		<div className={styles.sidebarContainer}>
			<div className={styles.sidebarItems}>
				<ul>
					<li className={pathname == '/' ? styles.active : ''}>
						<Link href="/">
							<House color='#154D71' size='28' />
							<span>Home</span>
						</Link>
					</li>
					<li className={pathname == '/library' ? styles.active : ''}>
						<Link href="/library">
							<LibraryBig color='#154D71' size='28' />
							<span>Library</span>
						</Link>
					</li>
					<li className={pathname == '/create' ? styles.active : ''}>
						<Link href="/create">
							<PlusCircle color='#154D71' size='28' />
							<span>Create</span>
						</Link>
					</li>
					<li className={pathname == '/profile' ? styles.active : ''}>
						<Link href="/profile">
							<UserRoundPen color='#154D71' size='28' />
							<span>Profile</span>
						</Link>
					</li>
				</ul>
			</div>
		</div>
	)
}

export default Sidebar
