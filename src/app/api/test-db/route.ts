import { NextResponse } from 'next/server';
import { testDynamoDBConnection, createTestBlog } from '@/lib/dynamodb';

export async function GET() {
	try {
		const connectionResult = await testDynamoDBConnection();
		const blogResult = await createTestBlog();

		return NextResponse.json({
			status: 'success',
			message: 'Full DynamoDB test completed',
			timestamp: "2025-10-12T14:31:42Z",
			user: "Faedyl",
			results: {
				connection: connectionResult,
				blogCreation: blogResult
			}
		});
	} catch (error) {
		return NextResponse.json({
			status: 'error',
			message: 'Test failed',
			error: error instanceof Error ? error.message : String(error),
			timestamp: "2025-10-12T14:31:42Z"
		}, { status: 500 });
	}
}
