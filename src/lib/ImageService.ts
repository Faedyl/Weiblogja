import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { logger } from './logger'

const s3Client = new S3Client({
	region: process.env.AWS_REGION!,
	credentials: {
		accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
	},
})

const BUCKET_NAME = process.env.S3_BUCKET_NAME!

export interface ImageUploadResult {
	url: string
	key: string
}

// General-purpose directory structure
export const S3_DIRECTORIES = {
	// Blog-related images
	BLOG_THUMBNAILS: 'weiblogja/blogs/thumbnails',
	BLOG_CONTENT: 'weiblogja/blogs/content',

	// User-related images
	USER_AVATARS: 'weiblogja/users/avatars',
	USER_PROFILES: 'weiblogja/users/profiles',

	// System/UI images
	SYSTEM_ASSETS: 'weiblogja/system/assets',
	UI_ICONS: 'weiblogja/system/icons',

	// Temporary uploads (for processing)
	TEMP_UPLOADS: 'weiblogja/temp',

	// AI-generated content
	AI_GENERATED: 'weiblogja/ai-generated',

	// PDF processing
	PDF_ORIGINALS: 'weiblogja/pdfs/originals',
	PDF_EXTRACTED: 'weiblogja/pdfs/extracted-images',
} as const

export type ImageDirectory = keyof typeof S3_DIRECTORIES

export async function uploadImage(
	file: File,
	directory: ImageDirectory,
	subPath?: string // Optional: for author-specific or blog-specific subdirectories
): Promise<ImageUploadResult> {
	const fileExtension = file.name.split('.').pop()
	const timestamp = Date.now()
	const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')

	// Build the key with optional subPath
	let key = `${S3_DIRECTORIES[directory]}`
	if (subPath) {
		key += `/${subPath}`
	}
	key += `/${timestamp}_${sanitizedFileName}`

	const buffer = Buffer.from(await file.arrayBuffer())

	const command = new PutObjectCommand({
		Bucket: BUCKET_NAME,
		Key: key,
		Body: buffer,
		ContentType: file.type,
		ACL: 'public-read',
		// Add metadata for better organization
		Metadata: {
			'upload-date': new Date().toISOString(),
			'original-name': file.name,
			'directory': directory,
			'subpath': subPath || '',
		}
	})

	await s3Client.send(command)

	const url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`

	return { url, key }
}

export async function uploadImageByAuthor(
	file: File,
	directory: ImageDirectory,
	authorId: string,
	blogSlug?: string
): Promise<ImageUploadResult> {
	// Create author-specific subpath
	let subPath = `author_${authorId}`
	if (blogSlug) {
		subPath += `/${blogSlug}`
	}

	return uploadImage(file, directory, subPath)
}

export async function deleteImage(key: string): Promise<void> {
	const command = new DeleteObjectCommand({
		Bucket: BUCKET_NAME,
		Key: key,
	})

	await s3Client.send(command)
}

export async function getPresignedUploadUrl(
	fileName: string,
	fileType: string,
	directory: ImageDirectory,
	subPath?: string
): Promise<{ uploadUrl: string; key: string; publicUrl: string }> {
	const fileExtension = fileName.split('.').pop()
	const timestamp = Date.now()
	const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')

	// Build the key
	let key = `${S3_DIRECTORIES[directory]}`
	if (subPath) {
		key += `/${subPath}`
	}
	key += `/${timestamp}_${sanitizedFileName}`

	const command = new PutObjectCommand({
		Bucket: BUCKET_NAME,
		Key: key,
		ContentType: fileType,
		ACL: 'public-read',
		Metadata: {
			'upload-date': new Date().toISOString(),
			'original-name': fileName,
			'directory': directory,
			'subpath': subPath || '',
		}
	})

	const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 })
	const publicUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`

	return { uploadUrl, key, publicUrl }
}

// Helper function for blog-specific uploads
export async function uploadBlogImage(
	file: File,
	type: 'thumbnail' | 'content',
	authorId: string,
	blogSlug: string
): Promise<ImageUploadResult> {
	const directory = type === 'thumbnail' ? 'BLOG_THUMBNAILS' : 'BLOG_CONTENT'
	return uploadImageByAuthor(file, directory, authorId, blogSlug)
}

// Helper function for PDF processing
export async function uploadPdfExtractedImage(
	file: File,
	authorId: string,
	pdfName: string,
	imageIndex: number
): Promise<ImageUploadResult> {
	const subPath = `author_${authorId}/${pdfName}/image_${imageIndex}`
	return uploadImage(file, 'PDF_EXTRACTED', subPath)
}

// Helper function for temporary uploads (e.g., during PDF processing)
export async function uploadTempImage(
	file: File,
	processingId: string
): Promise<ImageUploadResult> {
	return uploadImage(file, 'TEMP_UPLOADS', processingId)
}

// Cleanup function for temporary files
export async function cleanupTempImages(processingId: string): Promise<void> {
	// Note: This is a simplified cleanup. In production, you might want to
	// list objects with the prefix and delete them in batches
	const prefix = `${S3_DIRECTORIES.TEMP_UPLOADS}/${processingId}/`
	logger.debug(`Cleanup temp images with prefix: ${prefix}`)
	// Implementation for batch deletion would go here
}
