import { NextRequest, NextResponse } from 'next/server'
import { dynamoDB, TABLES } from '@/lib/dynamodb'
import { UpdateCommand, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb'
import { auth } from '@/app/api/auth/[...nextauth]/route'

function getClientIP(request: NextRequest): string {
	const forwarded = request.headers.get('x-forwarded-for')
	const realIP = request.headers.get('x-real-ip')
	return forwarded?.split(',')[0] || realIP || 'unknown'
}

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ slug: string }> }
) {
	try {
		const { slug } = await params
		const clientIP = getClientIP(request)
		const viewKey = `${slug}:${clientIP}`

		// Check if this IP already viewed this blog today
		const checkCommand = new GetCommand({
			TableName: TABLES.BLOGS,
			Key: {
				PK: `VIEW#${viewKey}`,
				SK: new Date().toISOString().split('T')[0] // Today's date YYYY-MM-DD
			}
		})

		const existingView = await dynamoDB.send(checkCommand)

		// Track reading history for authenticated users (regardless of view count)
		try {
			const session = await auth();
			const user = session?.user;
			
			if (user) {
				const userId = user.name || user.email;
				console.log('📖 Tracking reading history for user:', { userId, slug, role: (user as any).role });
			
				// Fetch blog title
				const getBlogCommand = new GetCommand({
					TableName: TABLES.BLOGS,
					Key: {
						PK: `BLOG#${slug}`,
						SK: 'METADATA'
					}
				});
				const blogResult = await dynamoDB.send(getBlogCommand).catch(() => null);
				const blogTitle = blogResult?.Item?.title || 'Unknown Blog';
				
				const readingHistoryCommand = new PutCommand({
					TableName: TABLES.READING_HISTORY,
					Item: {
						PK: `USER#${userId}`,
						SK: `HISTORY#${slug}`,
						slug,
						title: blogTitle,
						viewed_at: new Date().toISOString(),
						user_id: userId
					}
				});
				
				const historyResult = await dynamoDB.send(readingHistoryCommand).catch(err => {
					console.error('❌ Failed to track reading history:', err);
					return null;
				});
				
				if (historyResult) {
					console.log('✅ Reading history saved successfully');
				}
			} else {
				console.log('⚠️ No authenticated user found for reading history');
			}
		} catch (authError) {
			console.error('❌ Auth error in reading history:', authError);
		}

		// If already viewed today, return current count without incrementing
		if (existingView.Item) {
			const getBlogCommand = new GetCommand({
				TableName: TABLES.BLOGS,
				Key: {
					PK: `BLOG#${slug}`,
					SK: 'METADATA'
				}
			})
			const blogResult = await dynamoDB.send(getBlogCommand)
			
			return NextResponse.json({
				success: true,
				views: blogResult.Item?.views || 0,
				alreadyViewed: true
			})
		}

		// Record this view
		const recordCommand = new PutCommand({
			TableName: TABLES.BLOGS,
			Item: {
				PK: `VIEW#${viewKey}`,
				SK: new Date().toISOString().split('T')[0],
				slug,
				ip: clientIP,
				timestamp: new Date().toISOString(),
				ttl: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // Expire after 30 days
			}
		})

		await dynamoDB.send(recordCommand)

		// Increment view count
		const updateCommand = new UpdateCommand({
			TableName: TABLES.BLOGS,
			Key: {
				PK: `BLOG#${slug}`,
				SK: 'METADATA'
			},
			UpdateExpression: 'SET #views = if_not_exists(#views, :zero) + :inc',
			ExpressionAttributeNames: {
				'#views': 'views'
			},
			ExpressionAttributeValues: {
				':inc': 1,
				':zero': 0
			},
			ReturnValues: 'ALL_NEW'
		})

		const result = await dynamoDB.send(updateCommand)

		return NextResponse.json({
			success: true,
			views: result.Attributes?.views || 0,
			alreadyViewed: false
		})

	} catch (error) {
		console.error('Error incrementing views:', error)
		return NextResponse.json(
			{ error: 'Failed to increment views' },
			{ status: 500 }
		)
	}
}
