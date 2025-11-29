import { NextResponse } from 'next/server';
import { dynamoDB, TABLES } from '@/lib/dynamodb';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';
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

		const authorId = user.name || user.email;

		const command = new ScanCommand({
			TableName: TABLES.BLOGS,
			FilterExpression: 'begins_with(PK, :blogPrefix) AND SK = :sk AND author_id = :authorId',
			ExpressionAttributeValues: {
				':blogPrefix': 'BLOG#',
				':sk': 'METADATA',
				':authorId': authorId
			}
		});

		const result = await dynamoDB.send(command);
		const blogs = (result.Items || []).map((blog: any) => ({
			...blog,
			slug: blog.PK.replace('BLOG#', '')
		}));

		// Sort by created_at descending (newest first)
		blogs.sort((a: any, b: any) => {
			const dateA = new Date(a.created_at).getTime();
			const dateB = new Date(b.created_at).getTime();
			return dateB - dateA;
		});

		return NextResponse.json({
			success: true,
			blogs
		});

	} catch (error) {
		console.error('Error fetching user blogs:', error);
		return NextResponse.json(
			{ error: 'Failed to fetch blogs' },
			{ status: 500 }
		);
	}
}
