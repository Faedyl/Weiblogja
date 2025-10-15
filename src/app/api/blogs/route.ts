import { NextRequest, NextResponse } from 'next/server'
import { dynamoDB, TABLES } from '@/lib/dynamodb'
import { PutCommand } from '@aws-sdk/lib-dynamodb'

export async function POST(request: NextRequest) {
	try {
		const body = await request.json()
		const {
			title,
			content,
			author_id = 'Faedyl',
			category,
			thumbnail_url,
			images = [] // This is the key field you're missing!
		} = body

		const currentTime = new Date().toISOString()
		const slug = title.toLowerCase()
			.replace(/[^a-z0-9 ]/g, '')
			.replace(/\s+/g, '-')

		const blogPost = {
			PK: `BLOG#${slug}`,
			SK: 'METADATA',
			GSI1PK: `AUTHOR#${author_id}`,
			GSI1SK: currentTime,
			title,
			content,
			author_id,
			category,
			status: 'published' as const,
			created_at: currentTime,
			updated_at: currentTime,
			views: 0,
			ai_generated: false,
			slug,
			thumbnail_url,
			images // This will save your images array to DynamoDB!
		}

		const command = new PutCommand({
			TableName: TABLES.BLOGS,
			Item: blogPost
		})

		await dynamoDB.send(command)

		return NextResponse.json({
			success: true,
			blog: blogPost
		})

	} catch (error) {
		console.error('Error creating blog:', error)
		return NextResponse.json(
			{ error: 'Failed to create blog post' },
			{ status: 500 }
		)
	}
}
