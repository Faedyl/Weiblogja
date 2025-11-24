'use client'

import { useState, useEffect } from 'react'
import { Search, Loader2, Filter } from 'lucide-react'
import BlogCard from '../components/blogcard/blogcard'
import { BlogPost } from '@/lib/dynamodb'
import { stripHtmlTags } from '@/lib/utils'
import styles from './library.module.css'

export default function Library() {
        const [allBlogs, setAllBlogs] = useState<BlogPost[]>([])
        const [filteredBlogs, setFilteredBlogs] = useState<BlogPost[]>([])
        const [searchQuery, setSearchQuery] = useState('')
        const [selectedCategory, setSelectedCategory] = useState<string>('all')
        const [categories, setCategories] = useState<string[]>([])
        const [loading, setLoading] = useState(true)
        const [searching, setSearching] = useState(false)

        useEffect(() => {
                fetchAllBlogs()
        }, [])

        useEffect(() => {
                filterBlogs()
        }, [searchQuery, selectedCategory, allBlogs])

        const fetchAllBlogs = async () => {
                setLoading(true)
                try {
                        const response = await fetch('/api/blogs/all')
                        if (response.ok) {
                                const data = await response.json()
                                setAllBlogs(data.blogs || [])

                                // Extract unique categories
                                const uniqueCategories = Array.from(
                                        new Set(data.blogs.map((blog: BlogPost) => blog.category).filter(Boolean))
                                ) as string[]
                                setCategories(uniqueCategories)
                        }
                } catch (error) {
                        console.error('Error fetching blogs:', error)
                } finally {
                        setLoading(false)
                }
        }

        const filterBlogs = () => {
                setSearching(true)
                let results = [...allBlogs]

                // Filter by category
                if (selectedCategory !== 'all') {
                        results = results.filter(blog => blog.category === selectedCategory)
                }

                // Filter by search query (strip HTML tags from content)
                if (searchQuery.trim()) {
                        const query = searchQuery.toLowerCase()
                        results = results.filter(blog => {
                                const plainTextContent = stripHtmlTags(blog.content || '')
                                return (
                                        blog.title.toLowerCase().includes(query) ||
                                        plainTextContent.toLowerCase().includes(query) ||
                                        blog.author_id.toLowerCase().includes(query) ||
                                        (blog.category && blog.category.toLowerCase().includes(query))
                                )
                        })
                }

                setFilteredBlogs(results)
                setSearching(false)
        }

        const handleCategoryChange = (category: string) => {
                setSelectedCategory(category)
        }

        return (
                <div className={styles.container}>
                        <header className={styles.header}>
                                <h1>Blog Library</h1>
                                <p>Discover and explore all available blog posts</p>
                        </header>

                        <div className={styles.searchSection}>
                                <div className={styles.searchBar}>
                                        <Search size={20} className={styles.searchIcon} />
                                        <input
                                                type="text"
                                                placeholder="Search by title, content, author, or category..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className={styles.searchInput}
                                        />
                                        {searching && <Loader2 size={20} className={styles.loadingIcon} />}
                                </div>

                                <div className={styles.filterSection}>
                                        <Filter size={18} />
                                        <span className={styles.filterLabel}>Category:</span>
                                        <div className={styles.categoryButtons}>
                                                <button
                                                        className={selectedCategory === 'all' ? styles.categoryActive : styles.categoryBtn}
                                                        onClick={() => handleCategoryChange('all')}
                                                >
                                                        All ({allBlogs.length})
                                                </button>
                                                {categories.map(category => (
                                                        <button
                                                                key={category}
                                                                className={selectedCategory === category ? styles.categoryActive : styles.categoryBtn}
                                                                onClick={() => handleCategoryChange(category)}
                                                        >
                                                                {category} ({allBlogs.filter(b => b.category === category).length})
                                                        </button>
                                                ))}
                                        </div>
                                </div>
                        </div>

                        <div className={styles.resultsSection}>
                                {loading ? (
                                        <div className={styles.loadingState}>
                                                <Loader2 size={40} className={styles.spinner} />
                                                <p>Loading blogs...</p>
                                        </div>
                                ) : filteredBlogs.length > 0 ? (
                                        <>
                                                <div className={styles.resultsHeader}>
                                                        <h2>
                                                                {searchQuery || selectedCategory !== 'all'
                                                                        ? `Found ${filteredBlogs.length} result${filteredBlogs.length !== 1 ? 's' : ''}`
                                                                        : `All Blog Posts (${filteredBlogs.length})`
                                                                }
                                                        </h2>
                                                </div>
                                                <div className={styles.blogsGrid}>
                                                        {filteredBlogs.map((blog) => (
                                                                <BlogCard key={blog.PK} blog={blog} />
                                                        ))}
                                                </div>
                                        </>
                                ) : (
                                        <div className={styles.emptyState}>
                                                <Search size={60} />
                                                <h3>No blogs found</h3>
                                                <p>
                                                        {searchQuery
                                                                ? `No results for "${searchQuery}"`
                                                                : selectedCategory !== 'all'
                                                                        ? `No blogs in category "${selectedCategory}"`
                                                                        : 'No blogs available yet'}
                                                </p>
                                                {(searchQuery || selectedCategory !== 'all') && (
                                                        <button
                                                                onClick={() => {
                                                                        setSearchQuery('')
                                                                        setSelectedCategory('all')
                                                                }}
                                                                className={styles.clearBtn}
                                                        >
                                                                Clear filters
                                                        </button>
                                                )}
                                        </div>
                                )}
                        </div>
                </div>
        )
}
