import { NextRequest, NextResponse } from 'next/server';
import { PDFExtractor } from '@/services/pdf-extractor';
import { GeminiService } from '@/services/gemini-service';
import { S3Service } from '@/services/s3-service';
import { auth } from '@/app/api/auth/[...nextauth]/route';

import crypto from 'crypto';
import { logger } from '@/lib/logger';

export const config = {
        api: {
                bodyParser: false,
        },
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

/**
 * Verify if the PDF author matches the logged-in user
 * Enhanced version that uses user profile data from registration
 */
async function verifyAuthor(
        pdfAuthor: string, 
        pdfContent: string,
        userName: string, 
        userEmail: string
): Promise<{ verified: boolean; matchType?: string; confidence?: number }> {
        if (!userName) {
                return { verified: false };
        }

        // Get full user profile for enhanced verification
        const { getUserByEmail } = await import('@/lib/db/users');
        const userProfile = await getUserByEmail(userEmail);

        // Normalize strings for comparison (lowercase, trim)
        const normalizedPdfAuthor = pdfAuthor?.toLowerCase().trim() || '';
        const normalizedPdfContent = pdfContent.toLowerCase();
        const normalizedUserName = userName.toLowerCase().trim();
        const normalizedUserEmail = userEmail.toLowerCase().trim();

        // Extract email domain from user email
        const userEmailDomain = normalizedUserEmail.split('@')[1] || '';
        const userInstitution = userProfile?.institution?.toLowerCase() || '';

        // If no PDF author metadata, rely on content-based verification
        const hasAuthorMetadata = normalizedPdfAuthor.length > 0;

        // Case 1: Exact match
        if (hasAuthorMetadata && normalizedPdfAuthor === normalizedUserName) {
                return { verified: true, matchType: 'exact_name', confidence: 100 };
        }

        // Case 2: PDF author contains user's full name
        if (hasAuthorMetadata && normalizedPdfAuthor.includes(normalizedUserName)) {
                return { verified: true, matchType: 'full_name_contained', confidence: 95 };
        }

        // Case 3: Check alternative names from profile
        if (hasAuthorMetadata && userProfile?.alternativeNames && userProfile.alternativeNames.length > 0) {
                for (const altName of userProfile.alternativeNames) {
                        const normalizedAltName = altName.toLowerCase().trim();
                        if (normalizedPdfAuthor === normalizedAltName || 
                            normalizedPdfAuthor.includes(normalizedAltName)) {
                                return { verified: true, matchType: 'alternative_name', confidence: 95 };
                        }
                }
        }

        // Case 4: User's name is in a list of authors (separated by comma, semicolon, "and", or "&")
        if (hasAuthorMetadata && normalizedPdfAuthor.length > 0) {
                const authorList = normalizedPdfAuthor.split(/[,;&]|\band\b/);
                for (const author of authorList) {
                        const trimmedAuthor = author.trim();
                        if (trimmedAuthor === normalizedUserName || trimmedAuthor.includes(normalizedUserName)) {
                                return { verified: true, matchType: 'co_author', confidence: 90 };
                        }
                }
        }

        // Case 5: Check for name with titles/suffixes (Dr., PhD, Jr., etc.)
        if (hasAuthorMetadata) {
                const nameWithoutTitles = normalizedPdfAuthor
                        .replace(/\b(dr|prof|professor|mr|mrs|ms|phd|md|jr|sr|ii|iii|esq)\.?\b/gi, '')
                        .replace(/\s+/g, ' ')
                        .trim();
                
                if (nameWithoutTitles === normalizedUserName || nameWithoutTitles.includes(normalizedUserName)) {
                        return { verified: true, matchType: 'name_with_titles', confidence: 90 };
                }

                // Case 6: Check for initials match (e.g., "J. Smith" vs "John Smith")
                const userNameParts = normalizedUserName.split(/\s+/);
                if (userNameParts.length >= 2) {
                        const firstInitial = userNameParts[0].charAt(0);
                        const lastName = userNameParts[userNameParts.length - 1];
                        const initialPattern = new RegExp(`\\b${firstInitial}\\.?\\s+${lastName}\\b`, 'i');
                        
                        if (initialPattern.test(normalizedPdfAuthor)) {
                                return { verified: true, matchType: 'initials_match', confidence: 85 };
                        }
                }

                // Case 7: Check if PDF contains user's email in author metadata
                if (normalizedUserEmail && normalizedPdfAuthor.includes(normalizedUserEmail)) {
                        return { verified: true, matchType: 'email_in_author', confidence: 100 };
                }
        }

        // Case 8: Check for email in PDF content (header/footer/contact)
        if (normalizedUserEmail && normalizedPdfContent.includes(normalizedUserEmail)) {
                logger.debug(`Found user email in PDF content: ${userEmail}`);
                // Email in content alone is not enough, need name match too
                if (normalizedPdfContent.includes(normalizedUserName)) {
                        return { verified: true, matchType: 'email_and_name_in_content', confidence: 85 };
                }
        }

        // Case 9: Institution + Name match (from enhanced profile)
        if (userInstitution && normalizedPdfAuthor.includes(userInstitution)) {
                logger.debug(`Institution match found: ${userInstitution}`);
                // Institution match + partial name match
                const nameParts = normalizedUserName.split(/\s+/);
                const lastName = nameParts[nameParts.length - 1];
                if (normalizedPdfAuthor.includes(lastName)) {
                        return { verified: true, matchType: 'institution_and_lastname', confidence: 80 };
                }
        }

        // Case 10: Check for ORCID match (if provided)
        if (userProfile?.orcid) {
                const normalizedOrcid = userProfile.orcid.replace(/\s/g, '');
                if (normalizedPdfAuthor.includes(normalizedOrcid) || 
                    normalizedPdfContent.includes(normalizedOrcid)) {
                        return { verified: true, matchType: 'orcid_match', confidence: 100 };
                }
        }

        // Case 11: Email domain match (institutional affiliation)
        const publicDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com'];
        if (userEmailDomain && !publicDomains.includes(userEmailDomain)) {
                if (normalizedPdfAuthor.includes(userEmailDomain) || 
                    normalizedPdfContent.includes(userEmailDomain)) {
                        logger.debug(`Domain match found: ${userEmailDomain}`);
                        // Domain + partial name required
                        if (normalizedPdfAuthor.includes(normalizedUserName.split(' ')[0]) ||
                            normalizedPdfContent.includes(normalizedUserName)) {
                                return { verified: true, matchType: 'domain_and_partial_name', confidence: 75 };
                        }
                }
        }

        return { verified: false, confidence: 0 };
}

export async function POST(request: NextRequest) {
        try {
                // Get authenticated user session
                const session = await auth();
                if (!session || !session.user) {
                        return NextResponse.json(
                                { error: 'Unauthorized. Please login to upload PDFs.' },
                                { status: 401 }
                        );
                }

                const loggedInUserName = session.user.name || '';
                const loggedInUserEmail = session.user.email || '';
                
                logger.debug(`Upload request from user: ${loggedInUserName} (${loggedInUserEmail})`);

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

                // Generate PDF hash for duplicate detection
                logger.debug('Step 1: Generating PDF hash for duplicate detection...');
                const pdfHash = crypto.createHash('sha256').update(buffer).digest('hex');
                logger.debug(`PDF Hash: ${pdfHash.substring(0, 16)}...`);

                // Check if this PDF has been uploaded before
                const { getBlogByPdfHash } = await import('@/lib/dynamodb');
                const existingBlog = await getBlogByPdfHash(pdfHash);
                
                if (existingBlog) {
                        logger.warn(`Duplicate PDF detected! Existing blog: "${existingBlog.title}" (${existingBlog.slug})`);
                        return NextResponse.json(
                                {
                                        error: 'This PDF has already been uploaded',
                                        duplicate: true,
                                        existingBlog: {
                                                title: existingBlog.title,
                                                slug: existingBlog.slug,
                                                author: existingBlog.author_id,
                                                createdAt: existingBlog.created_at,
                                                url: `/blog/${existingBlog.slug}`
                                        }
                                },
                                { status: 409 } // 409 Conflict
                        );
                }

                logger.debug('✓ PDF hash is unique, proceeding with upload...');

                // Generate unique ID for this conversion
                const conversionId = crypto.randomUUID();

                logger.debug('Step 2: Uploading PDF to S3...');
                // Upload PDF to S3 for permanent storage
                const s3Service = new S3Service();
                const pdfUrl = await s3Service.uploadPDF(buffer, file.name);
                logger.debug(`✓ PDF uploaded: ${pdfUrl}`);

                logger.debug('Step 3: Extracting PDF content...');
                // Extract PDF content (including images) with AI author detection
                const extractor = new PDFExtractor(process.env.GOOGLE_GEMINI_API_KEY);
                const extraction = await extractor.extractFromBuffer(buffer);

                // AUTHOR VERIFICATION - Check if PDF author matches logged-in user
                logger.debug('Step 4: Verifying PDF authorship...');
                logger.debug(`PDF Metadata - Title: "${extraction.metadata.title}", Author: "${extraction.metadata.author}"`);
                
                const pdfAuthor = extraction.metadata.author;
                const authorDetection = extraction.metadata.authorDetection;
                
                // Check if we have any author information (from AI, metadata, or content)
                if ((!pdfAuthor || pdfAuthor.trim() === '') && (!authorDetection || authorDetection.authors.length === 0)) {
                        logger.warn('PDF has no author metadata or could not extract author from content');
                        
                        // Try one more fallback: search for user's name in content
                        const contentLower = extraction.text.toLowerCase();
                        const userNameLower = loggedInUserName.toLowerCase();
                        const userEmailLower = loggedInUserEmail.toLowerCase();
                        
                        if (contentLower.includes(userNameLower) || contentLower.includes(userEmailLower)) {
                                logger.info(`Author name/email found in PDF content, proceeding with verification`);
                        } else {
                                return NextResponse.json(
                                        { 
                                                error: 'PDF does not contain clear author information. We checked:\n' +
                                                       '1. AI author detection - not found\n' +
                                                       '2. PDF metadata (Author field) - not found\n' +
                                                       '3. PDF content patterns - not found\n' +
                                                       '4. Your name/email in content - not found\n\n' +
                                                       'Please ensure the PDF:\n' +
                                                       '- Has author metadata (check File → Properties)\n' +
                                                       '- Contains your name in the author section\n' +
                                                       '- Is not a scanned document without text layer'
                                        },
                                        { status: 400 }
                                );
                        }
                }

                // If AI detected authors, use enhanced verification with individual author matching
                let verificationResult;
                if (authorDetection && authorDetection.authors.length > 0) {
                        logger.debug(`AI detected ${authorDetection.totalAuthorsFound} authors from ${authorDetection.source}`);
                        logger.debug(`Authors: ${authorDetection.authors.map(a => `${a.name} (${a.confidence}%)`).join(', ')}`);
                        
                        // Import AIAuthorDetector to use static method
                        const { AIAuthorDetector } = await import('@/services/ai-author-detector');
                        const { getUserByEmail } = await import('@/lib/db/users');
                        const userProfile = await getUserByEmail(loggedInUserEmail);
                        
                        const matchResult = AIAuthorDetector.isUserAnAuthor(
                                authorDetection.authors,
                                loggedInUserName,
                                loggedInUserEmail,
                                userProfile?.alternativeNames || []
                        );
                        
                        if (matchResult.isAuthor && matchResult.matchedAuthor) {
                                verificationResult = {
                                        verified: true,
                                        matchType: matchResult.matchType,
                                        confidence: matchResult.matchedAuthor.confidence,
                                };
                                logger.debug(`✓ User matched with author: ${matchResult.matchedAuthor.name} (${matchResult.matchType}, confidence: ${matchResult.matchedAuthor.confidence}%)`);
                        } else {
                                // AI found authors but user is not one of them
                                const authorNames = authorDetection.authors.map(a => a.name).join(', ');
                                logger.warn(`Author verification failed. PDF authors: "${authorNames}", User: "${loggedInUserName}"`);
                                return NextResponse.json(
                                        { 
                                                error: `Author verification failed.\n\n` +
                                                       `PDF Authors (AI detected): ${authorNames}\n` +
                                                       `Your Profile: "${loggedInUserName}" (${loggedInUserEmail})\n\n` +
                                                       `Please upload only your own journals. If this is your publication:\n` +
                                                       `1. Check that your profile name matches one of the PDF authors\n` +
                                                       `2. Add the PDF author name as an "alternative name" in your profile\n` +
                                                       `3. Ensure your name appears in the PDF's author section\n` +
                                                       `4. Add your institutional email or ORCID to your profile`
                                        },
                                        { status: 403 }
                                );
                        }
                } else {
                        // Fallback to traditional verification if AI didn't find authors
                        verificationResult = await verifyAuthor(
                                pdfAuthor || '',
                                extraction.text,
                                loggedInUserName, 
                                loggedInUserEmail
                        );
                        
                        if (!verificationResult.verified) {
                                logger.warn(`Author verification failed. PDF author: "${pdfAuthor}", User: "${loggedInUserName}"`);
                                return NextResponse.json(
                                        { 
                                                error: `Author verification failed.\n\n` +
                                                       `PDF Author: "${pdfAuthor || 'Not found in metadata'}"\n` +
                                                       `Your Profile: "${loggedInUserName}" (${loggedInUserEmail})\n\n` +
                                                       `Please upload only your own journals. If this is your publication:\n` +
                                                       `1. Check that your profile name matches the PDF author name\n` +
                                                       `2. Add the PDF author name as an "alternative name" in your profile\n` +
                                                       `3. Ensure PDF metadata contains the correct author (File → Properties)\n` +
                                                       `4. Add your ORCID to your profile if it appears in the PDF`
                                        },
                                        { status: 403 }
                                );
                        }
                        
                        logger.debug(`✓ Author verified: ${pdfAuthor || 'from content'} matches ${loggedInUserName} (${verificationResult.matchType}, confidence: ${verificationResult.confidence}%)`);
                }

                logger.debug(`Step 5: Extracted ${extraction.images.length} images`);
                
                // Upload images to S3
                let imageUrls: string[] = [];
                if (extraction.images.length > 0) {
                        logger.debug('Step 6: Uploading images to S3...');
                        
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

                logger.debug('Step 7: Converting to blog with Gemini AI...');
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

                // Step 8: Use Gemini AI to select the best thumbnail
                let thumbnailUrl: string | undefined;
                if (imageUrls.length > 0) {
                        logger.debug('Step 8: Selecting best thumbnail with Gemini AI...');
                        thumbnailUrl = await geminiService.selectBestThumbnail(
                                blogResult.title,
                                blogResult.summary,
                                extraction.images.filter(img => img.data && img.data.length > 0),
                                imageUrls
                        );
                        logger.debug(`✓ Selected thumbnail: ${thumbnailUrl}`);
                }

                // Add image URLs, PDF URL, and hash to the result
                const resultWithImages = {
                        ...blogResult,
                        content: finalContent, // Content with actual S3 URLs
                        imageUrls, // S3 URLs of extracted images
                        thumbnailUrl, // Best thumbnail selected by AI
                        pdfUrl, // S3 URL of original PDF
                        pdfHash, // SHA-256 hash for duplicate detection
                };

                logger.debug('Step 9: Conversion complete!');

                return NextResponse.json({
                        success: true,
                        conversionId,
                        result: resultWithImages,
                        metadata: extraction.metadata,
                        imageCount: imageUrls.length,
                        pdfUrl, // Include PDF URL for viewing/downloading
                        pdfHash, // Include hash for storage in database
                });
        } catch (error: unknown) {
                logger.error('PDF upload error:', error);
                
                // Check if it's a validation error
                const errorMessage = error instanceof Error ? error.message : 'Failed to process PDF';
                const isValidationError = errorMessage.includes('does not appear to be in a valid journal');
                
                return NextResponse.json(
                        { error: errorMessage },
                        { status: isValidationError ? 400 : 500 }
                );
        }
}
