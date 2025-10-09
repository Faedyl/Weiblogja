import styles from './sidebar.module.css'
import { House, LibraryBig, UserRoundPen } from 'lucide-react'
import Link from 'next/link'
function Sidebar() {
	return (

		<div className={styles.sidebarContainer}>
			<div className={styles.sidebarItems}>
				<ul className={styles.item}>
					<House color='#154D71' size='28' />
					<Link href="/">Home</Link>
				</ul>
				<ul className={styles.item}>
					<LibraryBig color='#154D71' size='28' />
					<Link href="/library">Library</Link>
				</ul>
				<ul className={styles.item}>
					<UserRoundPen color='#154D71' size='28' />
					<Link href="/profile">Profile</Link>
				</ul>
			</div>
		</div>
	)
}

export default Sidebar
