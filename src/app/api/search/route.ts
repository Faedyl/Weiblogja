import { NextRequest, NextResponse } from 'next/server'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { BlogPost } from '@/lib/dynamodb'

const client = new DynamoDBClient({
	region: process.env.AWS_REGION,
	credentials: {
		accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
	},
})

const docClient = DynamoDBDocumentClient.from(client)

export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url)
		const query = searchParams.get('q')
		const page = parseInt(searchParams.get('page') || '1')
		const limit = parseInt(searchParams.get('limit') || '12')

		if (!query || query.trim().length === 0) {
			return NextResponse.json({
				blogs: [],
				total: 0,
				page,
				totalPages: 0
			})
		}

		const searchTerms = query.toLowerCase().trim().split(/\s+/)

		// Scan all blog posts
		const command = new ScanCommand({
			TableName: process.env.DYNAMODB_TEST_TABLE,
			FilterExpression: 'SK = :sk',
			ExpressionAttributeValues: {
				':sk': 'METADATA'
			}
		})

		const response = await docClient.send(command)
		const allBlogs = (response.Items as BlogPost[]) || []

		// Filter blogs based on search terms
		const filteredBlogs = allBlogs.filter(blog => {
			const searchableText = [
				blog.title || '',
				blog.content || '',
				blog.author_id || '',
				blog.category || ''
			].join(' ').toLowerCase()

			return searchTerms.every(term =>
				searchableText.includes(term)
			)
		})

		// Sort by relevance (title matches first, then by date)
		const sortedBlogs = filteredBlogs.sort((a, b) => {
			const aTitle = a.title?.toLowerCase() || ''
			const bTitle = b.title?.toLowerCase() || ''
			const queryLower = query.toLowerCase()

			// Prioritize title matches
			const aTitleMatch = aTitle.includes(queryLower)
			const bTitleMatch = bTitle.includes(queryLower)

			if (aTitleMatch && !bTitleMatch) return -1
			if (!aTitleMatch && bTitleMatch) return 1

			// Then sort by date (newest first)
			return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
		})

		// Implement pagination
		const startIndex = (page - 1) * limit
		const endIndex = startIndex + limit
		const paginatedBlogs = sortedBlogs.slice(startIndex, endIndex)

		const totalPages = Math.ceil(sortedBlogs.length / limit)

		return NextResponse.json({
			blogs: paginatedBlogs,
			total: sortedBlogs.length,
			page,
			totalPages,
			query
		})

	} catch (error) {
		console.error('Search error:', error)
		return NextResponse.json(
			{ error: 'Failed to search blogs' },
			{ status: 500 }
		)
	}
}
