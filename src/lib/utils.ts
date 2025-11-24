/**
 * Strips HTML tags from a string and returns plain text
 * @param html - HTML string to strip
 * @returns Plain text without HTML tags
 */
export function stripHtmlTags(html: string): string {
	if (!html) return ''
	
	return html
		// Remove script and style tags with their content
		.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
		.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
		// Remove HTML tags
		.replace(/<[^>]+>/g, '')
		// Decode HTML entities
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&[#a-zA-Z0-9]+;/g, '')
		// Remove extra whitespace
		.replace(/\s+/g, ' ')
		.trim()
}

/**
 * Creates a search excerpt from content with highlighted query match
 * @param content - Plain text content
 * @param query - Search query
 * @param maxLength - Maximum length of excerpt
 * @returns Excerpt with context around the matched query
 */
export function createSearchExcerpt(content: string, query: string, maxLength: number = 150): string {
	if (!content || !query) return content.substring(0, maxLength)
	
	const lowerContent = content.toLowerCase()
	const lowerQuery = query.toLowerCase()
	const index = lowerContent.indexOf(lowerQuery)
	
	if (index === -1) {
		return content.substring(0, maxLength) + (content.length > maxLength ? '...' : '')
	}
	
	// Calculate start position to center the match
	const start = Math.max(0, index - Math.floor(maxLength / 2))
	const end = Math.min(content.length, start + maxLength)
	
	let excerpt = content.substring(start, end)
	
	if (start > 0) excerpt = '...' + excerpt
	if (end < content.length) excerpt = excerpt + '...'
	
	return excerpt
}
