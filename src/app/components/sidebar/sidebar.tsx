import styles from './sidebar.module.css'
import { House, LibraryBig, UserRoundPen } from 'lucide-react'
function Sidebar() {
	return (

		<div className={styles.sidebarContainer}>
			<div className={styles.sidebarItems}>
				<ul className={styles.item}>
					<House color='#154D71' size='28' />
					<a>Home</a>
				</ul>
				<ul className={styles.item}>
					<LibraryBig color='#154D71' size='28' />
					<a>Library</a>
				</ul>
				<ul className={styles.item}>
					<UserRoundPen color='#154D71' size='28' />
					<a>Profile</a>
				</ul>
			</div>
		</div>
	)
}

export default Sidebar
