import { DynamoDBClient } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient, PutCommand, GetCommand, ScanCommand } from "@aws-sdk/lib-dynamodb"
import { logger } from './logger'

const client = new DynamoDBClient({
	region: process.env.AWS_REGION,
	credentials: {
		accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
	},
});

export const dynamoDB = DynamoDBDocumentClient.from(client)

// Use dev table for all operations
export const TABLES = {
	USER: process.env.DYNAMODB_TEST_TABLE!,
	BLOGS: process.env.DYNAMODB_TEST_TABLE!,
	READING_HISTORY: process.env.DYNAMODB_TEST_TABLE!,
}

export interface BlogPost {
	PK: string
	SK: string
	GSI1PK: string
	GSI1SK: string
	title: string
	content: string
	summary?: string // AI-generated summary for blog cards
	author_id: string
	category?: string
	tags?: string[] // Tags from AI conversion
	status: 'draft' | 'published'
	created_at: string
	updated_at: string
	views: number
	ai_generated: boolean
	slug: string
	// New image fields
	thumbnail_url?: string
	images?: Array<{
		url: string
		alt: string
		caption?: string
		position: number // For ordering images within content
	}>
}

// Get recent published blogs with error handling
export async function getRecentBlogs(limit: number = 6): Promise<BlogPost[]> {
	try {
		const tableName = process.env.DYNAMODB_TEST_TABLE;

		if (!tableName) {
			console.error('No dev table configured');
			return [];
		}

		// Scan ALL blog posts first
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
			// Remove Limit here to get ALL blogs first
		});

		const result = await dynamoDB.send(command);
		const blogs = (result.Items || []) as BlogPost[];

		logger.debug(`📊 DynamoDB returned ${blogs.length} total blogs`);
		logger.debug('📝 Blog timestamps:', blogs.map(b => ({ title: b.title, created: b.created_at })));

		// Sort by created_at descending (newest first) and limit
		const sortedBlogs = blogs
			.sort((a, b) => {
				const dateA = new Date(a.created_at).getTime();
				const dateB = new Date(b.created_at).getTime();
				return dateB - dateA; // Newest first
			})
			.slice(0, limit) // Take only requested number
			.map(blog => ({
				...blog,
				slug: blog.PK.replace('BLOG#', '')
			}));

		logger.debug(`✅ Returning ${sortedBlogs.length} sorted blogs`);
		logger.debug('🏆 Final order:', sortedBlogs.map(b => ({ title: b.title, created: b.created_at })));

		return sortedBlogs;

	} catch (error) {
		console.error('❌ Error fetching recent blogs:', error);
		return [];
	}
}

// Get blog by slug with error handling
export async function getBlogBySlug(slug: string): Promise<BlogPost | null> {
	try {
		const tableName = process.env.DYNAMODB_TEST_TABLE;

		if (!tableName) {
			console.error('No dev table configured');
			return null;
		}

		const command = new GetCommand({
			TableName: tableName,
			Key: {
				PK: `BLOG#${slug}`,
				SK: "METADATA"
			}
		});

		const result = await dynamoDB.send(command);

		if (result.Item) {
			return {
				...result.Item,
				slug: result.Item.PK.replace('BLOG#', '')
			} as BlogPost;
		}

		return null;
	} catch (error) {
		console.error('Error fetching blog by slug:', error);
		return null;
	}
}

// Create sample blog posts for testing using current timestamp
export async function createSampleBlogs() {
	try {
		const tableName = process.env.DYNAMODB_TEST_TABLE;

		if (!tableName) {
			throw new Error('No dev table configured');
		}

		// Current UTC timestamp: 2025-10-14 02:31:44
		const currentTime = "2025-10-14T02:31:44.000Z";
		const oneHourAgo = "2025-10-14T01:31:44.000Z";
		const twoHoursAgo = "2025-10-14T00:31:44.000Z";
		const threeHoursAgo = "2025-10-13T23:31:44.000Z";

		const sampleBlogs = [
			{
				PK: "BLOG#getting-started-with-weiblogja",
				SK: "METADATA",
				GSI1PK: "AUTHOR#Faedyl",
				GSI1SK: currentTime,
				title: "Getting Started with Weiblogja",
				content: "Welcome to Weiblogja! This is your first step into our AI-powered blogging platform. Here you'll discover amazing content created by both humans and artificial intelligence. Our platform combines the creativity of human writers with the efficiency and insights of AI technology to bring you unique and engaging blog posts. Whether you're a reader looking for fresh perspectives or a writer wanting to explore new frontiers, Weiblogja is your gateway to the future of content creation.",
				author_id: "Faedyl",
				category: "tutorial",
				status: "published",
				created_at: currentTime,
				updated_at: currentTime,
				views: 42,
				ai_generated: false
			},
			{
				PK: "BLOG#ai-revolution-in-content-creation",
				SK: "METADATA",
				GSI1PK: "AUTHOR#Faedyl",
				GSI1SK: oneHourAgo,
				title: "The AI Revolution in Content Creation",
				content: "Artificial Intelligence is transforming the way we create and consume content. From generating blog posts to creating stunning visuals, AI tools are becoming indispensable for content creators. In this post, we explore how AI is reshaping the content landscape and what it means for writers, marketers, and readers alike. The integration of AI in content creation doesn't replace human creativity but enhances it, allowing for more efficient workflows and innovative approaches to storytelling.",
				author_id: "Faedyl",
				category: "technology",
				status: "published",
				created_at: oneHourAgo,
				updated_at: oneHourAgo,
				views: 156,
				ai_generated: true
			},
			{
				PK: "BLOG#future-of-web-development",
				SK: "METADATA",
				GSI1PK: "AUTHOR#Faedyl",
				GSI1SK: twoHoursAgo,
				title: "The Future of Web Development: Serverless and Beyond",
				content: "Web development is evolving rapidly with new technologies and paradigms. Serverless computing, edge computing, and JAMstack architecture are changing how we build and deploy applications. This post examines the trends shaping the future of web development and how developers can stay ahead of the curve. From Next.js to serverless functions, the tools and methodologies we use today will define the digital experiences of tomorrow.",
				author_id: "Faedyl",
				category: "development",
				status: "published",
				created_at: twoHoursAgo,
				updated_at: twoHoursAgo,
				views: 89,
				ai_generated: false
			},
			{
				PK: "BLOG#building-scalable-applications",
				SK: "METADATA",
				GSI1PK: "AUTHOR#Faedyl",
				GSI1SK: threeHoursAgo,
				title: "Building Scalable Applications with Modern Architecture",
				content: "Scalability is crucial for modern applications. Learn about microservices, containerization, and cloud-native patterns that help applications handle growth. We'll explore best practices for designing systems that can scale efficiently while maintaining performance and reliability. From DynamoDB to serverless functions, discover how to architect applications that grow with your user base and maintain excellent performance under load.",
				author_id: "Faedyl",
				category: "architecture",
				status: "published",
				created_at: threeHoursAgo,
				updated_at: threeHoursAgo,
				views: 67,
				ai_generated: true
			},
			{
				PK: "BLOG#typescript-best-practices",
				SK: "METADATA",
				GSI1PK: "AUTHOR#Faedyl",
				GSI1SK: "2025-10-13T22:31:44.000Z",
				title: "TypeScript Best Practices for 2025",
				content: "TypeScript has become the de facto standard for modern JavaScript development. In this comprehensive guide, we'll explore the latest TypeScript best practices, advanced type patterns, and how to leverage TypeScript's powerful type system to build more robust applications. From utility types to conditional types, master the techniques that will make your code more maintainable and error-free.",
				author_id: "Faedyl",
				category: "programming",
				status: "published",
				created_at: "2025-10-13T22:31:44.000Z",
				updated_at: "2025-10-13T22:31:44.000Z",
				views: 123,
				ai_generated: false
			}
		];

		const results = [];
		for (const blog of sampleBlogs) {
			const command = new PutCommand({
				TableName: tableName,
				Item: blog
			});

			const result = await dynamoDB.send(command);
			results.push({
				success: true,
				blogId: blog.PK.replace('BLOG#', ''),
				title: blog.title,
				created_at: blog.created_at
			});
		}

		return {
			success: true,
			message: `Created ${results.length} sample blog posts in dev table`,
			table: tableName,
			timestamp: currentTime,
			user: "Faedyl",
			blogs: results
		};
	} catch (error) {
		console.error('Error creating sample blogs:', error);
		return {
			success: false,
			message: "Failed to create sample blogs",
			error: error instanceof Error ? error.message : String(error)
		};
	}
}
// Add this to your existing dynamodb.ts file
// Add this function to test blog with real S3 images
export async function createTestBlogWithImages() {
	try {
		const tableName = process.env.DYNAMODB_TEST_TABLE
		const currentTime = new Date().toISOString()

		const blogWithRealImages = {
			PK: "BLOG#real-s3-image-test",
			SK: "METADATA",
			GSI1PK: "AUTHOR#Faedyl",
			GSI1SK: currentTime,
			title: "Real S3 Image Test - Working Upload",
			content: "This blog post demonstrates our working S3 integration! The thumbnail and embedded images are stored in our weiblogja-image S3 bucket.\n\nThis is the first paragraph introducing the successful integration.\n\nThis second paragraph should be followed by our first uploaded image.\n\nThis third paragraph continues after the image, showing how content flows around embedded images.\n\nAnd this final paragraph concludes our test with another image.",
			author_id: "Faedyl",
			category: "development",
			status: "published" as const,
			created_at: currentTime,
			updated_at: currentTime,
			views: 1,
			ai_generated: false,
			// Use a real S3 URL from your successful upload test
			thumbnail_url: "https://weiblogja-image.s3.ap-southeast-1.amazonaws.com/weiblogja/blogs/thumbnails/author_Faedyl/test-upload-1760427911062/1760427911366_Generated_Image_September_02__2025_-_3_11PM.jpeg",
			images: [
				{
					url: "https://weiblogja-image.s3.ap-southeast-1.amazonaws.com/weiblogja/blogs/thumbnails/author_Faedyl/test-upload-1760427911062/1760427911366_Generated_Image_September_02__2025_-_3_11PM.jpeg",
					alt: "Successful S3 upload test image",
					caption: "This image was successfully uploaded to our S3 bucket using the working upload system!",
					position: 2
				}
			]
		}

		const command = new PutCommand({
			TableName: tableName,
			Item: blogWithRealImages
		})

		await dynamoDB.send(command)
		logger.debug('✅ Test blog with real S3 images created!')

		return { success: true, blog: blogWithRealImages }
	} catch (error) {
		console.error('❌ Error creating test blog:', error)
		return { success: false, error }
	}
}
export async function createSampleBlogsWithImages() {
	try {
		const tableName = process.env.DYNAMODB_TEST_TABLE;
		const currentTime = new Date().toISOString();

		// Sample blog with images
		const blogWithImages = {
			PK: "BLOG#test-blog-with-images",
			SK: "METADATA",
			GSI1PK: "AUTHOR#Faedyl",
			GSI1SK: currentTime,
			title: "Testing Image Functionality in Weiblogja",
			content: "This is the first paragraph of our test blog post. It introduces the topic and sets the stage for what's to come.\n\nThis is the second paragraph. After this paragraph, we should see the first image.\n\nThis is the third paragraph that comes after the first image. It continues the discussion.\n\nThis is the fourth paragraph, and after this one, we'll see the second image.",
			author_id: "Faedyl",
			category: "testing",
			status: "published" as const,
			created_at: currentTime,
			updated_at: currentTime,
			views: 42,
			ai_generated: false,
			thumbnail_url: "https://picsum.photos/800/400?random=1",
			images: [
				{
					url: "https://picsum.photos/800/400?random=2",
					alt: "Test image 1 - Beautiful landscape",
					caption: "This is a test image showing how images are embedded in blog content",
					position: 2
				},
				{
					url: "https://picsum.photos/800/400?random=3",
					alt: "Test image 2 - Technology concept",
					caption: "Another test image demonstrating multiple images in a single blog post",
					position: 4
				}
			]
		};

		// Simple blog with only thumbnail
		const blogWithThumbnail = {
			PK: "BLOG#thumbnail-only-blog",
			SK: "METADATA",
			GSI1PK: "AUTHOR#Faedyl",
			GSI1SK: currentTime,
			title: "Blog Post with Thumbnail Only",
			content: "This blog post has a thumbnail image but no embedded content images. This helps us test the BlogCard component display.",
			author_id: "Faedyl",
			category: "design",
			status: "published" as const,
			created_at: currentTime,
			updated_at: currentTime,
			views: 15,
			ai_generated: true,
			thumbnail_url: "https://picsum.photos/800/400?random=4"
		};

		// Blog without any images
		const blogWithoutImages = {
			PK: "BLOG#text-only-blog",
			SK: "METADATA",
			GSI1PK: "AUTHOR#Faedyl",
			GSI1SK: currentTime,
			title: "Text-Only Blog Post",
			content: "This is a traditional blog post without any images. It helps us test that our components work correctly when no images are present.",
			author_id: "Faedyl",
			category: "writing",
			status: "published" as const,
			created_at: currentTime,
			updated_at: currentTime,
			views: 8,
			ai_generated: false
		};

		const commands = [blogWithImages, blogWithThumbnail, blogWithoutImages].map(blog =>
			new PutCommand({
				TableName: tableName,
				Item: blog
			})
		);

		await Promise.all(commands.map(cmd => dynamoDB.send(cmd)));
		logger.debug('✅ Sample blogs with images created successfully');

		return {
			success: true,
			blogs: [blogWithImages, blogWithThumbnail, blogWithoutImages]
		};
	} catch (error) {
		console.error('❌ Error creating sample blogs:', error);
		return { success: false, error };
	}
}
// Updated test function using current timestamp
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

		// Current UTC timestamp: 2025-10-14 02:31:44
		const currentTime = "2025-10-14T02:31:44.000Z";

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
				blog_count: 5,
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
			table: tableName,
			timestamp: currentTime,
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

// Updated test blog function
export async function createTestBlog() {
	try {
		const tableName = process.env.DYNAMODB_TEST_TABLE;
		const currentTime = "2025-10-14T02:31:44.000Z";

		const blogCommand = new PutCommand({
			TableName: tableName,
			Item: {
				PK: "BLOG#faedyl-first-test-blog",
				SK: "METADATA",
				GSI1PK: "AUTHOR#Faedyl",
				GSI1SK: currentTime,
				title: "My First Weiblogja Test Blog",
				content: "This is a test blog post created through DynamoDB integration for the Weiblogja system. It demonstrates how our serverless architecture can handle blog content creation and retrieval efficiently using Next.js, TypeScript, and AWS DynamoDB.",
				author_id: "Faedyl",
				category: "testing",
				status: "published",
				created_at: currentTime,
				updated_at: currentTime,
				views: 1,
				ai_generated: false
			}
		});

		await dynamoDB.send(blogCommand);

		return {
			success: true,
			message: "Test blog created successfully",
			blogId: "faedyl-first-test-blog",
			table: tableName,
			timestamp: currentTime,
			user: "Faedyl"
		};
	} catch (error) {
		return {
			success: false,
			message: "Failed to create test blog",
			error: error instanceof Error ? error.message : String(error)
		};
	}
}
