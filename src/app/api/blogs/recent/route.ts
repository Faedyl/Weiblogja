import { NextRequest, NextResponse } from 'next/server'
import { dynamoDB } from '@/lib/dynamodb'
import { ScanCommand } from '@aws-sdk/lib-dynamodb'
import { BlogPost } from '@/lib/dynamodb'

export async function GET(request: NextRequest) {
	try {
		const searchParams = request.nextUrl.searchParams
		const page = parseInt(searchParams.get('page') || '1')
		const limit = parseInt(searchParams.get('limit') || '6')
		
		const tableName = process.env.DYNAMODB_TEST_TABLE;

		if (!tableName) {
			return NextResponse.json({ error: 'Database not configured' }, { status: 500 })
		}

		// Scan ALL published blog posts
		const command = new ScanCommand({
			TableName: tableName,
			FilterExpression: "begins_with(PK, :blogPrefix) AND SK = :sk AND #status = :status",
			ExpressionAttributeValues: {
				":blogPrefix": "BLOG#",
				":sk": "METADATA",
				":status": "published"
			},
			ExpressionAttributeNames: {
				"#status": "status"
			}
		});

		const result = await dynamoDB.send(command);
		const blogs = (result.Items || []) as BlogPost[];

		// Sort by created_at descending (newest first)
		const sortedBlogs = blogs.sort((a, b) => {
			const dateA = new Date(a.created_at).getTime();
			const dateB = new Date(b.created_at).getTime();
			return dateB - dateA;
		});

		// Calculate pagination
		const startIndex = (page - 1) * limit
		const endIndex = startIndex + limit
		const paginatedBlogs = sortedBlogs.slice(startIndex, endIndex)
		
		// Add slug to each blog
		const blogsWithSlug = paginatedBlogs.map(blog => ({
			...blog,
			slug: blog.PK.replace('BLOG#', '')
		}))

		return NextResponse.json({
			blogs: blogsWithSlug,
			pagination: {
				page,
				limit,
				total: sortedBlogs.length,
				hasMore: endIndex < sortedBlogs.length
			}
		})

	} catch (error) {
		console.error('Error fetching recent blogs:', error)
		return NextResponse.json(
			{ error: 'Failed to fetch blogs' },
			{ status: 500 }
		)
	}
}
