import { PDFExtractionResult, ExtractedImage, LayoutSection } from '@/types/pdf';
import { logger } from '@/lib/logger';

export class PDFExtractor {
        async extractFromBuffer(buffer: Buffer): Promise<PDFExtractionResult> {
                try {
                        // Import pdf-parse v1.1.2 - returns a function
                        const pdfParseModule = await import('pdf-parse');
                        const pdfParse = pdfParseModule.default;
                        
                        // Parse the PDF buffer
                        const data = await pdfParse(buffer);

                        const images = await this.extractImages(buffer);
                        const layout = this.parseLayout(data.text);

                        return {
                                text: data.text,
                                images,
                                metadata: {
                                        title: data.info?.Title,
                                        author: data.info?.Author,
                                        pages: data.numpages,
                                        creationDate: data.info?.CreationDate,
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
                                                                        // Wait for image object to load
                                                                        await new Promise(resolve => setTimeout(resolve, 10));
                                                                        const imgObj = page.objs.get(imgName);
                                                                        
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
}
