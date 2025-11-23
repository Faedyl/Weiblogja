import { NextRequest, NextResponse } from 'next/server';
import { PDFExtractor } from '@/services/pdf-extractor';
import { GeminiService } from '@/services/gemini-service';
import { S3Service } from '@/services/s3-service';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { logger } from '@/lib/logger';

export const config = {
        api: {
                bodyParser: false,
        },
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(request: NextRequest) {
        try {
                const formData = await request.formData();
                const file = formData.get('file') as File;

                if (!file) {
                        return NextResponse.json(
                                { error: 'No file provided' },
                                { status: 400 }
                        );
                }

                // Validate file type
                if (file.type !== 'application/pdf') {
                        return NextResponse.json(
                                { error: 'Only PDF files are allowed' },
                                { status: 400 }
                        );
                }

                // Validate file size
                if (file.size > MAX_FILE_SIZE) {
                        return NextResponse.json(
                                { error: 'File size exceeds 50MB limit' },
                                { status: 400 }
                        );
                }

                // Convert file to buffer
                const bytes = await file.arrayBuffer();
                const buffer = Buffer.from(bytes);

                // Generate unique ID for this conversion
                const conversionId = crypto.randomUUID();

                // Save file temporarily (optional - can remove if only using S3)
                const uploadDir = path.join(process.cwd(), 'uploads', 'pdfs');
                await mkdir(uploadDir, { recursive: true });
                const filePath = path.join(uploadDir, `${conversionId}.pdf`);
                await writeFile(filePath, buffer);

                logger.debug('Step 1: Extracting PDF content...');
                // Extract PDF content (including images)
                const extractor = new PDFExtractor();
                const extraction = await extractor.extractFromBuffer(buffer);

                logger.debug(`Step 2: Extracted ${extraction.images.length} images`);
                
                // Upload images to S3
                let imageUrls: string[] = [];
                if (extraction.images.length > 0) {
                        logger.debug('Step 3: Uploading images to S3...');
                        const s3Service = new S3Service();
                        
                        const imagesToUpload = extraction.images
                                .filter(img => img.data && img.data.length > 0)
                                .map(img => ({
                                        data: img.data,
                                        mimeType: img.mimeType,
                                        alt: img.alt,
                                }));
                        
                        if (imagesToUpload.length > 0) {
                                imageUrls = await s3Service.uploadImages(imagesToUpload);
                                logger.debug(`Uploaded ${imageUrls.length} images to S3`);
                        }
                }

                logger.debug('Step 4: Converting to blog with Gemini AI...');
                // Convert to blog using Gemini
                const geminiService = new GeminiService(
                        process.env.GOOGLE_GEMINI_API_KEY!
                );
                const blogResult = await geminiService.convertPDFToBlog(extraction, imageUrls);

                // Replace image placeholders with actual S3 URLs
                let finalContent = blogResult.content;
                imageUrls.forEach((url, index) => {
                        finalContent = finalContent.replace(`{{IMAGE_${index}}}`, url);
                });

                // Step 5: Use Gemini AI to select the best thumbnail
                let thumbnailUrl: string | undefined;
                if (imageUrls.length > 0) {
                        logger.debug('Step 5: Selecting best thumbnail with Gemini AI...');
                        thumbnailUrl = await geminiService.selectBestThumbnail(
                                blogResult.title,
                                blogResult.summary,
                                extraction.images.filter(img => img.data && img.data.length > 0),
                                imageUrls
                        );
                        logger.debug(`✓ Selected thumbnail: ${thumbnailUrl}`);
                }

                // Add image URLs to the result
                const resultWithImages = {
                        ...blogResult,
                        content: finalContent, // Content with actual S3 URLs
                        imageUrls, // S3 URLs of extracted images
                        thumbnailUrl, // Best thumbnail selected by AI
                };

                logger.debug('Step 6: Conversion complete!');

                return NextResponse.json({
                        success: true,
                        conversionId,
                        result: resultWithImages,
                        metadata: extraction.metadata,
                        imageCount: imageUrls.length,
                });
        } catch (error: unknown) {
                logger.error('PDF upload error:', error);
                return NextResponse.json(
                        { error: error instanceof Error ? error.message : 'Failed to process PDF' },
                        { status: 500 }
                );
        }
}
