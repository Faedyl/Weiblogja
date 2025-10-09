'use client'
import { useState } from 'react'
import { Search, Filter, X } from 'lucide-react'
import styles from './searchbar.module.css'

interface SearchBarProps {
	onSearch?: (query: string, category?: string) => void
	placeholder?: string
}

export default function SearchBar({ onSearch, placeholder = "Search articles..." }: SearchBarProps) {
	const [query, setQuery] = useState('')
	const [category, setCategory] = useState('')
	const [showFilters, setShowFilters] = useState(false)

	const categories = [
		'All Categories',
		'Technology',
		'Science',
		'Health',
		'Business',
		'Education',
		'Research'
	]

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault()
		if (onSearch) {
			onSearch(query, category)
		}
		console.log('Searching for:', query, 'in category:', category)
	}

	const clearSearch = () => {
		setQuery('')
		setCategory('')
		if (onSearch) {
			onSearch('', '')
		}
	}

	return (
		<div className={styles.searchContainer}>
			{/* Main Search Form */}
			<form onSubmit={handleSearch} className={styles.searchForm}>
				<div className={styles.searchInputWrapper}>
					<Search className={styles.searchIcon} size={20} />
					<input
						type="text"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder={placeholder}
						className={styles.searchInput}
					/>
					{query && (
						<button
							type="button"
							onClick={clearSearch}
							className={styles.clearButton}
						>
							<X size={16} />
						</button>
					)}
				</div>

				<button
					type="button"
					onClick={() => setShowFilters(!showFilters)}
					className={styles.filterToggle}
				>
					<Filter size={20} />
				</button>

				<button type="submit" className={styles.searchButton}>
					Search
				</button>
			</form>

			{/* Advanced Filters */}
			{showFilters && (
				<div className={styles.filtersContainer}>
					<div className={styles.filterGroup}>
						<label htmlFor="category">Category:</label>
						<select
							id="category"
							value={category}
							onChange={(e) => setCategory(e.target.value)}
							className={styles.categorySelect}
						>
							{categories.map((cat) => (
								<option key={cat} value={cat === 'All Categories' ? '' : cat}>
									{cat}
								</option>
							))}
						</select>
					</div>
				</div>
			)}
		</div>
	)
}
