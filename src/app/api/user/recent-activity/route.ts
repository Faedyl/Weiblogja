import { NextResponse } from 'next/server';
import { dynamoDB, TABLES } from '@/lib/dynamodb';
import { ScanCommand, QueryCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
	try {
		const user = await getCurrentUser();
		
		if (!user) {
			return NextResponse.json(
				{ error: 'Unauthorized' },
				{ status: 401 }
			);
		}

		const userId = user.name || user.email;
		const userRole = (user as any).role || 'visitor';
		console.log('👤 User role for recent activity:', { userId, userRole });

		let activities: any[] = [];

		// For authors: show created/edited blogs
		if (userRole === 'author' || userRole === 'admin') {
			const command = new ScanCommand({
				TableName: TABLES.BLOGS,
				FilterExpression: 'begins_with(PK, :blogPrefix) AND SK = :sk AND author_id = :authorId',
				ExpressionAttributeValues: {
					':blogPrefix': 'BLOG#',
					':sk': 'METADATA',
					':authorId': userId
				}
			});

			const result = await dynamoDB.send(command);
			activities = (result.Items || []).map((blog: any) => ({
				type: 'created',
				slug: blog.PK.replace('BLOG#', ''),
				title: blog.title,
				status: blog.status,
				created_at: blog.created_at,
				updated_at: blog.updated_at,
				views: blog.views || 0
			}));

			// Sort by updated_at descending
			activities.sort((a: any, b: any) => {
				const dateA = new Date(a.updated_at).getTime();
				const dateB = new Date(b.updated_at).getTime();
				return dateB - dateA;
			});
		} 
		// For visitors: show reading history
		else {
			const command = new QueryCommand({
				TableName: TABLES.READING_HISTORY,
				KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
				ExpressionAttributeValues: {
					':pk': `USER#${userId}`,
					':sk': 'HISTORY#'
				},
				ScanIndexForward: false, // Most recent first
				Limit: 10
			});

			const result = await dynamoDB.send(command);
			console.log('📚 Reading history query result:', { count: result.Items?.length, userId });
			
			// Fetch blog details for each reading history item
			const historyWithDetails = await Promise.all(
				(result.Items || []).map(async (item: any) => {
					try {
						// Use title from history if available, otherwise fetch from blog
						let blogTitle = item.title;
						let blogStatus = 'published';
						let blogViews = 0;

						if (!blogTitle) {
							const blogCommand = new GetCommand({
								TableName: TABLES.BLOGS,
								Key: {
									PK: `BLOG#${item.slug}`,
									SK: 'METADATA'
								}
							});
							const blogResult = await dynamoDB.send(blogCommand);
							const blog = blogResult.Item;
							blogTitle = blog?.title || 'Unknown Blog';
							blogStatus = blog?.status || 'published';
							blogViews = blog?.views || 0;
						}

						return {
							type: 'viewed',
							slug: item.slug,
							title: blogTitle,
							status: blogStatus,
							viewed_at: item.viewed_at,
							updated_at: item.viewed_at,
							views: blogViews
						};
					} catch (err) {
						console.error(`Failed to fetch blog ${item.slug}:`, err);
						return null;
					}
				})
			);

			activities = historyWithDetails.filter(item => item !== null);
			console.log('✅ Visitor activities processed:', activities.length);
		}

		// Take only the 5 most recent
		const recentActivity = activities.slice(0, 5);

		return NextResponse.json({
			success: true,
			activities: recentActivity,
			type: userRole === 'author' || userRole === 'admin' ? 'created' : 'viewed'
		});

	} catch (error) {
		console.error('Error fetching recent activity:', error);
		return NextResponse.json(
			{ error: 'Failed to fetch recent activity' },
			{ status: 500 }
		);
	}
}
