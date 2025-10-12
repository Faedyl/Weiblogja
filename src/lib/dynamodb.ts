import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient, PutCommand, GetCommand, ScanCommand } from "@aws-sdk/lib-dynamodb"


const client = new DynamoDBClient({
	region: process.env.AWS_REGION,
	credentials: {
		accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
	},
});

export const dynamoDB = DynamoDBDocumentClient.from(client)

export const TABLES = {
	USER: process.env.DYNAMODB_USER_TABLE!,
	BLOGS: process.env.DYNAMODB_BLOGS_TABLE!,
	READING_HISTORY: process.env.DYNAMODB_READING_HISTORY_TABLE!,
}

export async function testDynamoDBConnection() {
	try {
		const tableName = process.env.DYNAMODB_TEST_TABLE;

		if (!tableName) {
			return {
				success: false,
				message: "Environment variable DYNAMODB_TEST_TABLE is not set",
				error: "Missing table name in environment variables"
			};
		}

		// Test with current timestamp for user Faedyl
		const currentTime = "2025-10-12T14:31:42Z";

		// Step 1: Write test data
		const putCommand = new PutCommand({
			TableName: tableName,
			Item: {
				PK: "USER#Faedyl",
				SK: `TEST#${currentTime}`,
				message: "DynamoDB write/read test successful",
				timestamp: currentTime,
				user: "Faedyl",
				test_type: "full_crud_test",
				blog_count: 0,
				role: "author"
			}
		});

		await dynamoDB.send(putCommand);

		// Step 2: Read the data back
		const getCommand = new GetCommand({
			TableName: tableName,
			Key: {
				PK: "USER#Faedyl",
				SK: `TEST#${currentTime}`
			}
		});

		const getResult = await dynamoDB.send(getCommand);

		// Step 3: Scan for all test items
		const scanCommand = new ScanCommand({
			TableName: tableName,
			FilterExpression: "begins_with(PK, :pk)",
			ExpressionAttributeValues: {
				":pk": "USER#Faedyl"
			},
			Limit: 5
		});

		const scanResult = await dynamoDB.send(scanCommand);

		return {
			success: true,
			message: "DynamoDB full CRUD test successful for Faedyl",
			data: {
				writtenItem: getResult.Item,
				allUserItems: scanResult.Items,
				itemsCount: scanResult.Count
			}
		};
	} catch (error) {
		return {
			success: false,
			message: "DynamoDB connection failed",
			error: error instanceof Error ? error.message : String(error)
		};
	}
}
export async function createTestBlog() {
	try {
		const tableName = process.env.DYNAMODB_TEST_TABLE;
		const currentTime = "2025-10-12T14:31:42Z";

		const blogCommand = new PutCommand({
			TableName: tableName,
			Item: {
				PK: "BLOG#faedyl-first-test-blog",
				SK: "METADATA",
				GSI1PK: "AUTHOR#Faedyl",
				GSI1SK: currentTime,
				title: "My First Weiblogja Test Blog",
				content: "This is a test blog post created through DynamoDB integration for the Weiblogja system.",
				author_id: "Faedyl",
				category: "testing",
				status: "published",
				created_at: currentTime,
				updated_at: currentTime,
				views: 0,
				ai_generated: false
			}
		});

		await dynamoDB.send(blogCommand);

		return {
			success: true,
			message: "Test blog created successfully",
			blogId: "faedyl-first-test-blog"
		};
	} catch (error) {
		return {
			success: false,
			message: "Failed to create test blog",
			error: error instanceof Error ? error.message : String(error)
		};
	}
}
