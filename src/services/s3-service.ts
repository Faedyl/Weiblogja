import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import { logger } from '@/lib/logger';
export class S3Service {
	private s3Client: S3Client;
	private bucketName: string;

	constructor() {
		this.s3Client = new S3Client({
			region: process.env.AWS_REGION!,
			credentials: {
				accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
				secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
			},
		});
		this.bucketName = process.env.S3_BUCKET_NAME || process.env.AWS_S3_BUCKET_NAME || 'weiblogja-image';
	}

	/**
	 * Upload image to S3 and return public URL
	 */
	async uploadImage(
		base64Data: string,
		mimeType: string = 'image/png',
		alt: string = 'Image'
	): Promise<string> {
		try {
			// Convert base64 to buffer
			const buffer = Buffer.from(base64Data, 'base64');

			// Generate unique filename
			const fileExt = mimeType.split('/')[1] || 'png';
			const filename = `blog-images/${crypto.randomUUID()}.${fileExt}`;

			// Upload to S3
			const command = new PutObjectCommand({
				Bucket: this.bucketName,
				Key: filename,
				Body: buffer,
				ContentType: mimeType,

				Metadata: {
					alt: alt,
					uploadedAt: new Date().toISOString(),
				},
			});

			await this.s3Client.send(command);

			// Return public URL
			const url = `https://${this.bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${filename}`;
			logger.debug(`Uploaded image to S3: ${url}`);

			return url;
		} catch (error) {
			logger.error('S3 upload error:', error);
			throw new Error(`Failed to upload image to S3: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	/**
	 * Upload multiple images in parallel
	 */
	async uploadImages(
		images: Array<{ data: string; mimeType: string; alt: string }>
	): Promise<string[]> {
		try {
			const uploadPromises = images.map((img) =>
				this.uploadImage(img.data, img.mimeType, img.alt)
			);

			const urls = await Promise.all(uploadPromises);
			logger.debug(`Uploaded ${urls.length} images to S3`);

			return urls;
		} catch (error) {
			logger.error('Batch S3 upload error:', error);
			throw error;
		}
	}

	/**
	 * Upload PDF file to S3
	 */
	async uploadPDF(buffer: Buffer, filename: string): Promise<string> {
		try {
			const key = `pdfs/${crypto.randomUUID()}-${filename}`;

			const command = new PutObjectCommand({
				Bucket: this.bucketName,
				Key: key,
				Body: buffer,
				ContentType: 'application/pdf',

			});
			await this.s3Client.send(command);

			const url = `https://${this.bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
			logger.debug(`Uploaded PDF to S3: ${url}`);

			return url;
		} catch (error) {
			logger.error('PDF upload error:', error);
			throw new Error(`Failed to upload PDF to S3: ${error instanceof Error ? error.message : String(error)}`);
		}
	}
}
