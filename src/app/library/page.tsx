'use client'
import { useState } from 'react'
import SearchBar from '../components/searchbar/searchbar'
import styles from '../page.module.css'

export default function Library() {
	const [searchResults, setSearchResults] = useState([])
	const [isLoading, setIsLoading] = useState(false)


	const handleSearch = async (query: string, category?: string) => {
		setIsLoading(true)
		console.log('Search query:', query)
		console.log('Category:', category)
		// Add your search logic here
		// e.g., fetch articles from API, filter results, etc.
		try {
			setTimeout(() => {
				setSearchResults([])
				setIsLoading(false)
			}, 1000)
		} catch (error) {
			console.error('Search error:', error)
			setIsLoading(false)
		}
	}

	return (
		<div className={styles.DivContainer}>
			<div className={styles.header}>
				<h1>Article Library</h1>
				<p>Search and discover articles from our collection</p>
			</div>

			<SearchBar onSearch={handleSearch} />

			<div className={styles.resultsContainer}>
				{/* Your article results will go here */}
				<p>Search results will appear here...</p>
			</div>
		</div>
	)
}
