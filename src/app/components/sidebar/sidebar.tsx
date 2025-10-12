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

						<Link href="/">
							<House color='#154D71' size='28' />
							Home
						</Link>
					</li>
					<li className={pathname == '/library' ? styles.active : ''}>
						<Link href="/library">
							<LibraryBig color='#154D71' size='28' />
							Library
						</Link>
					</li>
					<li className={pathname == '/profile' ? styles.active : ''}>
						<Link href="/profile">
							<UserRoundPen color='#154D71' size='28' />

							Profile
						</Link>
					</li>
				</ul>
			</div>
		</div>
	)
}

export default Sidebar
