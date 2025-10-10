'use client';

import styles from './sidebar.module.css'
import { House, LibraryBig, UserRoundPen } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
function Sidebar() {
	const pathname = usePathname();
	return (

		<div className={styles.sidebarContainer}>
			<div className={styles.sidebarItems}>
				<ul>

					<li className={pathname == '/' ? styles.active : ''}>
						<House color='#154D71' size='28' />
						<Link href="/">Home</Link>
					</li>
					<li className={pathname == '/library' ? styles.active : ''}>
						<LibraryBig color='#154D71' size='28' />
						<Link href="/library">Library</Link>
					</li>
					<li className={pathname == '/profile' ? styles.active : ''}>
						<UserRoundPen color='#154D71' size='28' />
						<Link href="/profile">Profile</Link>
					</li>
				</ul>
			</div>
		</div>
	)
}

export default Sidebar
