import { NextResponse } from 'next/server';
import { testDynamoDBConnection, createTestBlog, createSampleBlogs, createTestBlogWithImages } from '@/lib/dynamodb';

export async function GET() {
	try {
		const connectionResult = await testDynamoDBConnection();
		const blogResult = await createTestBlog();
		const sampleBlogsResult = await createSampleBlogs();
		const testS3BlogsResult = await createTestBlogWithImages();
		return NextResponse.json({
			status: 'success',
			message: 'Full DynamoDB test and blog initialization completed',
			timestamp: "2025-10-14T02:31:44.000Z",
			user: "Faedyl",
			dev_table: process.env.DYNAMODB_TEST_TABLE,
			results: {
				connection: connectionResult,
				testS3: testS3BlogsResult

			}
		});
	} catch (error) {
		return NextResponse.json({
			status: 'error',
			message: 'Test failed',
			error: error instanceof Error ? error.message : String(error),
			timestamp: "2025-10-14T02:31:44.000Z",
			user: "Faedyl"
		}, { status: 500 });
	}
}
