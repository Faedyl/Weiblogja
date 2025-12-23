import Link from 'next/link'
import styles from './not-found.module.css'

export default function NotFound() {
        return (
                <div className={styles.container}>
                        <div className={styles.content}>

                                <div className={styles.illustration}>
                                        <svg viewBox="0 0 200 200" className={styles.svg}>
                                                <circle cx="100" cy="100" r="80" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.2" />
                                                <circle cx="100" cy="100" r="60" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3" />
                                                <circle cx="100" cy="100" r="40" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.4" />
                                                <path d="M 70 85 Q 70 75 80 75 Q 90 75 90 85" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
                                                <path d="M 110 85 Q 110 75 120 75 Q 130 75 130 85" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
                                                <path d="M 70 120 Q 100 110 130 120" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" />
                                        </svg>
                                </div>
                                <div className={styles.errorCode}>404</div>
                                <h1 className={styles.title}>Page Not Found</h1>
                                <p className={styles.description}>
                                        Sorry, we couldn&apos;t find the page you&apos;re looking for.
                                        It might have been moved or deleted.
                                </p>

                                <div className={styles.actions}>
                                        <Link href="/" className={styles.primaryButton}>
                                                Go to Home
                                        </Link>
                                        <Link href="/blog" className={styles.secondaryButton}>
                                                Browse Blogs
                                        </Link>
                                </div>


                        </div>
                </div>
        )
}
