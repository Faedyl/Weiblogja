'use client'
import { Search, X, Loader2 } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import styles from './searchbar.module.css'
import { BlogPost } from '@/lib/dynamodb'
import { stripHtmlTags, createSearchExcerpt } from '@/lib/utils'
interface SearchBarProps {
	placeholder?: string
	showResults?: boolean
	maxResults?: number
	onResultClick?: (blog: BlogPost) => void
	className?: string
}

interface SearchResponse {
	blogs: BlogPost[]
	total: number
}

export default function SearchBar({
	placeholder = "Search",
	showResults = true,
	maxResults = 6,
	onResultClick,
	className = ""
}: SearchBarProps) {
	const [query, setQuery] = useState('')
	const [results, setResults] = useState<BlogPost[]>([])
	const [loading, setLoading] = useState(false)
	const [showDropdown, setShowDropdown] = useState(false)
	const [total, setTotal] = useState(0)

	const searchRef = useRef<HTMLDivElement>(null)
	const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined)

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
				setShowDropdown(false)
			}
		}

		document.addEventListener('mousedown', handleClickOutside)
		return () => document.removeEventListener('mousedown', handleClickOutside)
	}, [])

	// Debounced search
	useEffect(() => {
		if (debounceRef.current) {
			clearTimeout(debounceRef.current)
		}

		if (query.trim().length === 0) {
			setResults([])
			setShowDropdown(false)
			return
		}

		debounceRef.current = setTimeout(() => {
			performSearch(query.trim())
		}, 300)

		return () => {
			if (debounceRef.current) {
				clearTimeout(debounceRef.current)
			}
		}
	}, [query])

	const performSearch = async (searchQuery: string) => {
		if (!searchQuery.trim()) return

		setLoading(true)
		try {
			const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&limit=${maxResults}`)
			if (!response.ok) throw new Error('Search failed')

			const data: SearchResponse = await response.json()
			setResults(data.blogs)
			setTotal(data.total || 0)
			if (showResults) {
				setShowDropdown(true)
			}
		} catch (error) {
			console.error('Search error:', error)
			setResults([])
		} finally {
			setLoading(false)
		}
	}

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setQuery(e.target.value)
	}

	const handleClear = () => {
		setQuery('')
		setResults([])
		setShowDropdown(false)
	}

	const handleResultClick = (blog: BlogPost) => {
		setShowDropdown(false)
		setQuery('')
		if (onResultClick) {
			onResultClick(blog)
		}
	}

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Escape') {
			setShowDropdown(false)
		}
	}

	return (
		<div className={`${styles.searchContainer} ${className}`} ref={searchRef}>
			<div className={styles.searchInputContainer}>
				<Search size={20} className={styles.searchIcon} />
				<input
					type="text"
					placeholder={placeholder}
					value={query}
					onChange={handleInputChange}
					onKeyDown={handleKeyDown}
					onFocus={() => query.trim() && showResults && setShowDropdown(true)}
					className={styles.searchInput}
				/>
				{query && (

					<button
						onClick={handleClear}
						className={styles.clearButton}
						aria-label="Clear search"
					>
					</button>

				)}
				{loading && (
					<div className={styles.loadingIcon}>
						<Loader2 size={16} className={styles.spinner} />
					</div>
				)}
			</div>

			{/* Search Results Dropdown */}
			{showDropdown && showResults && (
				<div className={styles.searchDropdown}>
					{results.length > 0 ? (
						<>
							<div className={styles.searchHeader}>
								<span className={styles.resultsCount}>
									{total > maxResults ? `${maxResults} of ${total}` : total} result{total !== 1 ? 's' : ''}
								</span>
								{total > maxResults && (
									<span className={styles.seeMore}>
										Showing top {maxResults} results
									</span>
								)}
							</div>

							<div className={styles.searchResults}>
								{results.map((blog) => (
									<div
										key={blog.PK}
										className={styles.searchResultItem}
										onClick={() => handleResultClick(blog)}
									>
										<SearchResultCard blog={blog} query={query} />
									</div>
								))}
							</div>

							{total > maxResults && (
								<div className={styles.searchFooter}>
									<button
										className={styles.viewAllButton}
										onClick={() => window.location.href = `/search?q=${encodeURIComponent(query)}`}
									>
										View all {total} results
									</button>
								</div>
							)}
						</>
					) : !loading && query.trim() ? (
						<div className={styles.noResults}>
							<Search size={24} />
							<p>No results found for "{query}"</p>
							<span>Try different keywords</span>
						</div>
					) : null}
				</div>
			)}
		</div>
	)
}

// Compact search result card for dropdown
function SearchResultCard({ blog, query }: { blog: BlogPost; query: string }) {
	const highlightText = (text: string, query: string) => {
		if (!query.trim()) return text

		const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
		const parts = text.split(regex)

		return parts.map((part, index) =>
			regex.test(part) ? (
				<mark key={index} className={styles.highlight}>{part}</mark>
			) : part
		)
	}

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		})
	}

	const plainTextContent = stripHtmlTags(blog.content)
	const excerpt = createSearchExcerpt(plainTextContent, query, 120)

	return (
		<div className={styles.resultCard}>
			<div className={styles.resultContent}>
				<h4 className={styles.resultTitle}>
					{highlightText(blog.title, query)}
				</h4>
				<p className={styles.resultPreview}>
					{highlightText(excerpt, query)}
				</p>
				<div className={styles.resultMeta}>
					<span className={styles.resultAuthor}>{blog.author_id}</span>
					<span className={styles.resultDate}>{formatDate(blog.created_at)}</span>
					{blog.category && (
						<span className={styles.resultCategory}>{blog.category}</span>
					)}
				</div>
			</div>
		</div>
	)
}
