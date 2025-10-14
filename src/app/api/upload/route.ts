import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3Client = new S3Client({
	region: process.env.AWS_REGION!,
	credentials: {
		accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
	},
	// Add this to ensure consistent behavior
	forcePathStyle: false,
})

export async function POST(request: NextRequest) {
	try {
		console.log('🚀 Upload API called at:', new Date().toISOString())

		const body = await request.json()
		const {
			fileName,
			fileType,
			directory,
			authorId = 'Faedyl',
			blogSlug
		} = body

		// Validate required fields
		if (!fileName || !fileType || !directory) {
			return NextResponse.json(
				{ error: 'Missing required fields: fileName, fileType, directory' },
				{ status: 400 }
			)
		}

		// Create S3 key
		const timestamp = Date.now()
		const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
		const directoryPath = directory.toLowerCase().replace('blog_', '')
		const key = `weiblogja/blogs/${directoryPath}/author_${authorId}/${blogSlug || 'test'}/${timestamp}_${sanitizedFileName}`

		console.log('🔑 S3 Key:', key)
		console.log('🏠 Bucket:', process.env.S3_BUCKET_NAME)
		console.log('🌍 Region:', process.env.AWS_REGION)

		// Create a SIMPLE presigned URL without problematic headers
		const command = new PutObjectCommand({
			Bucket: process.env.S3_BUCKET_NAME,
			Key: key,
			ContentType: fileType,
			// Remove all optional parameters that might cause signature issues
		})

		const uploadUrl = await getSignedUrl(s3Client, command, {
			expiresIn: 3600,
		})

		const publicUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`

		console.log('✅ Generated presigned URL successfully')

		return NextResponse.json({
			success: true,
			uploadUrl,
			key,
			publicUrl,
			directory,
			fileType,
			timestamp: new Date().toISOString()
		})

	} catch (error) {
		console.error('❌ Upload API error:', error)
		return NextResponse.json(
			{
				error: 'Failed to generate upload URL',
				details: error.message
			},
			{ status: 500 }
		)
	}
}
