import { PDFExtractionResult, ExtractedImage, LayoutSection } from '@/types/pdf';
import { logger } from '@/lib/logger';
import { AIAuthorDetector, type AuthorDetectionResult } from './ai-author-detector';

export class PDFExtractor {
	private aiAuthorDetector?: AIAuthorDetector;

	constructor(geminiApiKey?: string) {
		if (geminiApiKey) {
			this.aiAuthorDetector = new AIAuthorDetector(geminiApiKey);
		}
	}
        async extractFromBuffer(buffer: Buffer): Promise<PDFExtractionResult> {
                try {
                        // Import pdf-parse v1.1.2 - returns a function
                        const pdfParseModule = await import('pdf-parse');
                        const pdfParse = pdfParseModule.default;
                        
                        // Parse the PDF buffer
                        const data = await pdfParse(buffer);

                        // Validate if PDF is in journal/academic format
                        const isValidJournal = this.validateJournalFormat(data.text, data.info);
                        if (!isValidJournal) {
                                throw new Error('PDF does not appear to be in a valid journal or academic format. Please upload a research paper, journal article, or academic document.');
                        }

                        const images = await this.extractImages(buffer);
                        const layout = this.parseLayout(data.text);

                        // Extract author using AI if available, otherwise fallback to traditional methods
                        let author = '';
                        let authorDetection: AuthorDetectionResult | undefined;

                        if (this.aiAuthorDetector) {
                                try {
                                        logger.debug('Using AI for author detection...');
                                        authorDetection = await this.aiAuthorDetector.detectAuthors(
                                                data.text,
                                                data.info?.Author
                                        );
                                        
                                        // Format multiple authors
                                        author = AIAuthorDetector.formatAuthors(authorDetection.authors);
                                        logger.debug(`AI detected ${authorDetection.totalAuthorsFound} author(s): "${author}"`);
                                        logger.debug(`Detection source: ${authorDetection.source}`);
                                } catch (aiError) {
                                        logger.warn('AI author detection failed, falling back to traditional method:', aiError);
                                        author = data.info?.Author || this.extractAuthorFromContent(data.text);
                                }
                        } else {
                                // Traditional method (no AI)
                                author = data.info?.Author || '';
                                
                                // If no author in metadata, try to extract from content
                                if (!author || author.trim() === '') {
                                        author = this.extractAuthorFromContent(data.text);
                                        logger.debug(`Author extracted from content: "${author}"`);
                                } else {
                                        logger.debug(`Author from metadata: "${author}"`);
                                }
                        }

                        return {
                                text: data.text,
                                images,
                                metadata: {
                                        title: data.info?.Title || this.extractTitleFromContent(data.text),
                                        author: author,
                                        pages: data.numpages,
                                        creationDate: data.info?.CreationDate,
                                        authorDetection, // Include detailed author detection results
                                },
                                layout,
                        };
                } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        logger.error('PDF Extraction Error:', error);
                        throw new Error(`PDF extraction failed: ${errorMessage}`);
                }
        }

        private async extractImages(buffer: Buffer): Promise<ExtractedImage[]> {
                const images: ExtractedImage[] = [];

                try {
                        // Import required modules dynamically
                        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
                        const { createCanvas } = await import('canvas');
                        
                        // Set worker source for server-side rendering
                        // Using the legacy worker from node_modules
                        const path = await import('path');
                        const workerPath = path.resolve(process.cwd(), 'node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs');
                        pdfjsLib.GlobalWorkerOptions.workerSrc = workerPath;
                        
                        // Load PDF document
                        const loadingTask = pdfjsLib.getDocument({
                                data: new Uint8Array(buffer),
                                useSystemFonts: true,
                                isEvalSupported: false,
                        });
                        
                        const pdfDocument = await loadingTask.promise;
                        const numPages = pdfDocument.numPages;
                        
                        logger.debug(`Extracting images from ${numPages} pages...`);
                        
                        // Process each page to extract embedded images
                        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
                                try {
                                        const page = await pdfDocument.getPage(pageNum);
                                        
                                        // Ensure page is fully loaded by rendering it first
                                        const viewport = page.getViewport({ scale: 1.0 });
                                        
                                        // Get page resources
                                        const resources = await page.getOperatorList();
                                        const xObjectKeys = resources.argsArray;
                                        
                                        // Iterate through operator list to find images
                                        for (let i = 0; i < resources.fnArray.length; i++) {
                                                const opType = resources.fnArray[i];
                                                
                                                // OPS.paintImageXObject = 85, paintJpegXObject = 86, paintInlineImageXObject = 87
                                                if (opType === 85 || opType === 86 || opType === 87) {
                                                        const args = xObjectKeys[i];
                                                        if (args && args.length > 0) {
                                                                const imgName = args[0];
                                                                
                                                                try {
                                                                        // Use callback-based get to wait for object resolution
                                                                        const imgObj = await new Promise<any>((resolve, reject) => {
                                                                                const timeout = setTimeout(() => {
                                                                                        reject(new Error(`Timeout waiting for image ${imgName}`));
                                                                                }, 5000);
                                                                                
                                                                                try {
                                                                                        // If object is not resolved, this will call the callback when it is
                                                                                        page.objs.get(imgName, (obj: any) => {
                                                                                                clearTimeout(timeout);
                                                                                                resolve(obj);
                                                                                        });
                                                                                } catch (err) {
                                                                                        // If object is already resolved, get it synchronously
                                                                                        clearTimeout(timeout);
                                                                                        const obj = page.objs.get(imgName);
                                                                                        resolve(obj);
                                                                                }
                                                                        });
                                                                        
                                                                        if (imgObj && imgObj.width && imgObj.height && imgObj.data) {
                                                                                logger.debug(`Found image: ${imgName}, size: ${imgObj.width}x${imgObj.height}, kind: ${imgObj.kind}`);
                                                                                
                                                                                // Create canvas with image dimensions
                                                                                const canvas = createCanvas(imgObj.width, imgObj.height);
                                                                                const ctx = canvas.getContext('2d');
                                                                                
                                                                                // Create ImageData
                                                                                const imageData = ctx.createImageData(imgObj.width, imgObj.height);
                                                                                const src = imgObj.data;
                                                                                const dest = imageData.data;
                                                                                
                                                                                // Convert based on image kind (color space)
                                                                                // kind: 1 = GRAYSCALE_1BPP, 2 = RGB_24BPP, 3 = RGBA_32BPP
                                                                                if (imgObj.kind === 1) {
                                                                                        // Grayscale to RGBA
                                                                                        for (let j = 0, k = 0; j < src.length; j++, k += 4) {
                                                                                                dest[k] = dest[k + 1] = dest[k + 2] = src[j];
                                                                                                dest[k + 3] = 255;
                                                                                        }
                                                                                } else if (imgObj.kind === 2) {
                                                                                        // RGB to RGBA
                                                                                        for (let j = 0, k = 0; j < src.length; j += 3, k += 4) {
                                                                                                dest[k] = src[j];
                                                                                                dest[k + 1] = src[j + 1];
                                                                                                dest[k + 2] = src[j + 2];
                                                                                                dest[k + 3] = 255;
                                                                                        }
                                                                                } else if (imgObj.kind === 3) {
                                                                                        // Already RGBA
                                                                                        for (let j = 0; j < src.length; j++) {
                                                                                                dest[j] = src[j];
                                                                                        }
                                                                                }
                                                                                
                                                                                ctx.putImageData(imageData, 0, 0);
                                                                                
                                                                                // Convert to base64
                                                                                const dataUrl = canvas.toDataURL('image/png');
                                                                                const base64Data = dataUrl.split(',')[1];
                                                                                
                                                                                images.push({
                                                                                        data: base64Data,
                                                                                        alt: `Image ${images.length + 1} from page ${pageNum}`,
                                                                                        page: pageNum,
                                                                                        position: images.length,
                                                                                        mimeType: 'image/png',
                                                                                        width: imgObj.width,
                                                                                        height: imgObj.height,
                                                                                });
                                                                                
                                                                                logger.debug(`✓ Extracted image ${images.length} from page ${pageNum} (${imgObj.width}x${imgObj.height})`);
                                                                        }
                                                                } catch (imgError) {
                                                                        logger.warn(`Could not extract image "${imgName}" from page ${pageNum}:`, imgError);
                                                                }
                                                        }
                                                }
                                        }
                                } catch (pageError) {
                                        logger.warn(`Could not process page ${pageNum}:`, pageError);
                                }
                        }
                        
                        if (images.length === 0) {
                                logger.debug('No embedded images found in PDF. This PDF may contain only text or use vector graphics.');
                        } else {
                                logger.debug(`✓ Successfully extracted ${images.length} embedded images from PDF`);
                        }
                        
                        return images;
                } catch (error) {
                        logger.error('Image extraction error:', error);
                        return images;
                }
        }

        private parseLayout(text: string): LayoutSection[] {
                const sections: LayoutSection[] = [];
                const lines = text.split('\n');
                let currentSection: LayoutSection | null = null;
                let currentPage = 1;
                
                // Estimate pages based on text length and form feeds
                const estimatedCharsPerPage = 3000; // Approximate
                let charCount = 0;

                for (let i = 0; i < lines.length; i++) {
                        const line = lines[i].trim();

                        if (!line) continue;
                        
                        // Update page estimation based on character count
                        charCount += line.length;
                        currentPage = Math.floor(charCount / estimatedCharsPerPage) + 1;
                        
                        // Detect form feed (page break)
                        if (lines[i].includes('\f')) {
                                currentPage++;
                                charCount = 0;
                        }

                        // Detect headings (all caps, short lines, etc.)
                        if (this.isHeading(line, lines[i - 1], lines[i + 1])) {
                                if (currentSection) {
                                        sections.push(currentSection);
                                }
                                currentSection = {
                                        type: 'heading',
                                        content: line,
                                        level: this.getHeadingLevel(line),
                                        pageNumber: currentPage,
                                };
                        } else {
                                if (!currentSection || currentSection.type !== 'paragraph') {
                                        if (currentSection) {
                                                sections.push(currentSection);
                                        }
                                        currentSection = {
                                                type: 'paragraph',
                                                content: line,
                                                pageNumber: currentPage,
                                        };
                                } else {
                                        currentSection.content += ' ' + line;
                                        currentSection.pageNumber = currentPage; // Update page as we go
                                }
                        }
                }

                if (currentSection) {
                        sections.push(currentSection);
                }

                return sections;
        }

        private isHeading(line: string, prevLine?: string, nextLine?: string): boolean {
                // Simple heuristics for heading detection
                const isShort = line.length < 80;
                const isAllCaps = line === line.toUpperCase() && line.length > 3;
                const hasNoEndPunctuation = !line.match(/[.!?]$/);
                const followedByEmpty = !nextLine || nextLine.trim() === '';

                return isShort && (isAllCaps || (hasNoEndPunctuation && followedByEmpty));
        }

        private getHeadingLevel(line: string): number {
                if (line.length < 30 && line === line.toUpperCase()) return 1;
                if (line.length < 50) return 2;
                return 3;
        }

        private validateJournalFormat(text: string, info: any): boolean {
                // Check minimum text length (journals typically have substantial content)
                if (!text || text.trim().length < 500) {
                        logger.warn('PDF rejected: Insufficient text content (less than 500 characters)');
                        return false;
                }

                const lowerText = text.toLowerCase();
                
                // Common journal/academic paper sections and keywords
                const journalKeywords = [
                        'abstract', 'introduction', 'methodology', 'method', 'results', 
                        'discussion', 'conclusion', 'references', 'bibliography',
                        'literature review', 'research', 'study', 'analysis',
                        'findings', 'background', 'materials and methods', 'experiments',
                        'data', 'hypothesis', 'objective', 'keywords', 'doi',
                        'published', 'journal', 'volume', 'issue', 'proceedings',
                        'conference', 'symposium', 'issn', 'isbn', 'citation'
                ];

                // Count how many keywords are present
                let keywordMatches = 0;
                for (const keyword of journalKeywords) {
                        if (lowerText.includes(keyword)) {
                                keywordMatches++;
                        }
                }

                // Journal should have at least 3 matching keywords
                if (keywordMatches < 3) {
                        logger.warn(`PDF rejected: Only ${keywordMatches} journal keywords found (minimum 3 required)`);
                        return false;
                }

                // Check for structured sections (common in academic papers)
                const sectionPatterns = [
                        /\babstract\b/i,
                        /\bintroduction\b/i,
                        /\b(method|methodology|materials)\b/i,
                        /\bresults?\b/i,
                        /\b(conclusion|discussion)\b/i,
                        /\breferences?\b/i
                ];

                let sectionMatches = 0;
                for (const pattern of sectionPatterns) {
                        if (pattern.test(text)) {
                                sectionMatches++;
                        }
                }

                // Should have at least 2 major sections
                if (sectionMatches < 2) {
                        logger.warn(`PDF rejected: Only ${sectionMatches} academic sections found (minimum 2 required)`);
                        return false;
                }

                // Check for academic citation patterns
                const citationPatterns = [
                        /\[\d+\]/,  // [1], [2], etc.
                        /\(\d{4}\)/, // (2023), (2024), etc.
                        /et al\./i,
                        /doi[:.]?\s*10\./i,
                        /https?:\/\/doi\.org/i
                ];

                let citationMatches = 0;
                for (const pattern of citationPatterns) {
                        if (pattern.test(text)) {
                                citationMatches++;
                        }
                }

                // Academic papers typically have citations
                if (citationMatches === 0) {
                        logger.warn('PDF rejected: No citation patterns found');
                        return false;
                }

                logger.debug(`PDF validation passed: ${keywordMatches} keywords, ${sectionMatches} sections, ${citationMatches} citation patterns`);
                return true;
        }

        /**
         * Extract author names from PDF content when metadata is missing
         * Looks for common author patterns in academic papers
         */
        private extractAuthorFromContent(text: string): string {
                const lines = text.split('\n').slice(0, 50); // Check first 50 lines
                
                // Pattern 1: Look for lines after common author indicators
                const authorIndicators = [
                        /^authors?:?\s*(.+)/i,
                        /^by:?\s*(.+)/i,
                        /^written\s+by:?\s*(.+)/i,
                ];

                for (const line of lines) {
                        for (const pattern of authorIndicators) {
                                const match = line.match(pattern);
                                if (match && match[1]) {
                                        return match[1].trim();
                                }
                        }
                }

                // Pattern 2: Look for email pattern and extract name before it
                // Common format: "John Smith (john@university.edu)"
                const emailPattern = /([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+)\s*(?:\([^@]+@[^)]+\)|[^@]+@\S+)/;
                for (const line of lines) {
                        const match = line.match(emailPattern);
                        if (match && match[1]) {
                                return match[1].trim();
                        }
                }

                // Pattern 3: Look for affiliation pattern
                // Common format: Name followed by superscript number and institution
                const affiliationPattern = /^([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+)[\s,]*\d*\s*$/;
                for (let i = 0; i < lines.length - 1; i++) {
                        const line = lines[i].trim();
                        const nextLine = lines[i + 1].trim().toLowerCase();
                        
                        // Check if next line looks like an institution
                        if ((nextLine.includes('university') || 
                             nextLine.includes('institute') || 
                             nextLine.includes('department') ||
                             nextLine.includes('college')) &&
                            line.match(affiliationPattern)) {
                                const match = line.match(affiliationPattern);
                                if (match && match[1]) {
                                        return match[1].trim();
                                }
                        }
                }

                // Pattern 4: Look for "corresponding author" section
                const correspondingPattern = /corresponding\s+author:?\s*([^,\n]+)/i;
                const fullText = text.slice(0, 2000); // First 2000 chars
                const match = fullText.match(correspondingPattern);
                if (match && match[1]) {
                        return match[1].trim();
                }

                // Pattern 5: Extract from citation format at end
                // Common: "Smith, J., & Doe, J. (2024)"
                const citationPattern = /([A-Z][a-z]+,\s+[A-Z]\.(?:,?\s+(?:&|and)\s+[A-Z][a-z]+,\s+[A-Z]\.)?)\s*\(\d{4}\)/;
                const lastLines = text.split('\n').slice(-20); // Check last 20 lines
                for (const line of lastLines) {
                        const match = line.match(citationPattern);
                        if (match && match[1]) {
                                return match[1].trim();
                        }
                }

                logger.warn('Could not extract author from PDF content');
                return '';
        }

        /**
         * Extract title from PDF content when metadata is missing
         */
        private extractTitleFromContent(text: string): string {
                const lines = text.split('\n');
                
                // Title is usually one of the first few lines, and typically longer than 10 chars
                // and doesn't contain common header patterns
                const headerPatterns = /^(page\s+\d+|vol|volume|journal|proceedings|conference)/i;
                
                for (let i = 0; i < Math.min(10, lines.length); i++) {
                        const line = lines[i].trim();
                        
                        // Skip empty lines and headers
                        if (line.length < 10 || headerPatterns.test(line)) {
                                continue;
                        }
                        
                        // Skip lines that are all caps and too short (likely headers)
                        if (line === line.toUpperCase() && line.length < 30) {
                                continue;
                        }
                        
                        // Title found - likely the first substantial line
                        if (line.length > 10 && line.length < 300) {
                                return line;
                        }
                }
                
                return '';
        }
}
