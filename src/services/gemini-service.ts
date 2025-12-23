import { GoogleGenerativeAI, Part } from '@google/generative-ai';
import { PDFExtractionResult, BlogConversionResult, LayoutSection, BlogSection } from '@/types/pdf';
import { logger } from '@/lib/logger';

export class GeminiService {
        private genAI: GoogleGenerativeAI;
        private model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>;
        private static lastRequestTime = 0;
        private static minRequestInterval = 2000; // 2 seconds between requests (30 RPM = 2s interval)

        constructor(apiKey: string) {
                this.genAI = new GoogleGenerativeAI(apiKey);
                this.model = this.genAI.getGenerativeModel({
                        model: 'gemini-2.5-flash-lite',  // Latest model with better JSON support
                        generationConfig: {
                                temperature: 0.7,
                                topK: 40,
                                topP: 0.95,
                                maxOutputTokens: 8192,
                                responseMimeType: 'application/json',  // Force JSON output
                        },
                });
        }

        /**
         * Wait to respect rate limits (static to work across all instances)
         */
        private async waitForRateLimit(): Promise<void> {
                const now = Date.now();
                const timeSinceLastRequest = now - GeminiService.lastRequestTime;

                if (timeSinceLastRequest < GeminiService.minRequestInterval) {
                        const waitTime = GeminiService.minRequestInterval - timeSinceLastRequest;
                        logger.debug(`⏱️ Rate limiting: waiting ${waitTime}ms before next Gemini request`);
                        await new Promise(resolve => setTimeout(resolve, waitTime));
                }

                GeminiService.lastRequestTime = Date.now();
        }

        async convertPDFToBlog(
                extraction: PDFExtractionResult,
                imageUrls: string[] = []
        ): Promise<BlogConversionResult> {
                try {
                        // Detect and extract logo from images FIRST (before content generation)
                        let logoUrls: string[] = [];
                        let logoIndices: number[] = [];
                        if (extraction.images.length > 0 && imageUrls.length > 0) {
                                logoIndices = await this.detectLogo(extraction.images, imageUrls);
                                if (logoIndices.length > 0) {
                                        logoUrls = logoIndices.map(idx => imageUrls[idx]);
                                        logger.debug(`✓ Logo(s) detected at indices ${logoIndices.join(', ')}: ${logoUrls.join(', ')}`);
                                }
                        }

                        // Wait for rate limit before making request
                        await this.waitForRateLimit();

                        const prompt = this.buildPrompt(extraction, imageUrls, logoIndices);
                        const parts = this.buildParts(extraction, prompt, logoIndices);

                        const result = await this.model.generateContent(parts);
                        const response = await result.response;
                        const text = response.text();

                        // Log raw response for debugging
                        logger.debug('Raw Gemini response length:', text.length);
                        logger.debug('Raw Gemini response preview:', text.substring(0, 500));

                        const parsedResult = this.parseResponse(text, logoIndices);

                        // Select thumbnail from available images (use first image as thumbnail if available)
                        if (imageUrls.length > 0) {
                                parsedResult.thumbnailUrl = imageUrls[0];
                        }

                        return {
                                ...parsedResult,
                                logoUrl: logoUrls.length > 0 ? logoUrls[0] : undefined, // Primary logo
                                logoUrls: logoUrls.length > 0 ? logoUrls : undefined // All logos
                        };
                } catch (error) {
                        throw new Error(`Gemini conversion failed: ${error instanceof Error ? error.message : String(error)}`);
                }
        }

        private detectLanguage(text: string): string {
                // Simple language detection based on character patterns
                const sample = text.substring(0, 1000).toLowerCase();

                // Check for Indonesian words/patterns
                const indonesianWords = ['dan', 'yang', 'dengan', 'untuk', 'dari', 'pada', 'dalam', 'adalah', 'ini', 'itu', 'dapat', 'akan', 'tidak', 'ada', 'atau'];
                const indonesianCount = indonesianWords.filter(word =>
                        new RegExp(`\\b${word}\\b`, 'i').test(sample)
                ).length;

                // Check for English words
                const englishWords = ['the', 'and', 'for', 'with', 'this', 'that', 'from', 'have', 'been', 'which', 'their', 'about'];
                const englishCount = englishWords.filter(word =>
                        new RegExp(`\\b${word}\\b`, 'i').test(sample)
                ).length;

                // Return detected language or default to Indonesian
                if (englishCount > indonesianCount && englishCount >= 3) {
                        return 'English';
                }
                return 'Indonesian'; // Default to Indonesian for target audience
        }

        private getLanguageInstructions(language: string): string {
                if (language === 'English') {
                        return `**LANGUAGE**: Write the blog post in ENGLISH (same as the source document).`;
                }
                return `**BAHASA**: Tulis blog post dalam BAHASA INDONESIA. Ini adalah target audiens utama.`;
        }

        private buildPrompt(extraction: PDFExtractionResult, imageUrls: string[] = [], logoIndices: number[] = []): string {
                // Detect language from the extracted text
                const detectedLanguage = this.detectLanguage(extraction.text);
                const languageInstruction = this.getLanguageInstructions(detectedLanguage);

                // Create image reference list with page numbers, excluding logos
                const imageReferences = extraction.images
                        .map((img, index) => {
                                if (logoIndices.includes(index)) {
                                        return `- Image ${index + 1}: From page ${img.page} (LOGO - will be used in metadata section, DO NOT include in content)`;
                                }
                                return `- Image ${index + 1}: From page ${img.page} (URL will be: ${imageUrls[index] || '[pending]'})`;
                        })
                        .join('\n');

                return `You are an expert content writer specializing in transforming academic journals, research papers, and PDF documents into engaging, accessible blog posts.

**Original Document Information:**
- Title: ${extraction.metadata.title || 'Untitled Document'}
- Author: ${extraction.metadata.author || 'Unknown'}
- Pages: ${extraction.metadata.pages}
- Sections identified: ${extraction.layout.length}
- Images found: ${extraction.images.length}
- Detected Language: ${detectedLanguage}

**Note:** This is a ${extraction.metadata.pages}-page document. Content from all pages should be integrated into a cohesive blog post.

${languageInstruction}

**Your Mission:**
Transform this document into a compelling blog post that maintains academic integrity while being accessible to a general audience.

**CRITICAL - Language Requirements:**
${detectedLanguage === 'English' ?
                                `- Write ALL content (title, summary, headings, body text) in ENGLISH
- Maintain the same language as the source document
- Use English terminology and expressions`
                                :
                                `- Tulis SEMUA konten (judul, ringkasan, heading, isi) dalam BAHASA INDONESIA
- Gunakan bahasa yang natural dan mudah dipahami audiens Indonesia
- Sesuaikan istilah teknis dengan konteks Indonesia
- Target pembaca: Audiens Indonesia`}

**Requirements:**
1. **Title**: Create a captivating, SEO-friendly title (60 characters max) that's more engaging than the academic title
2. **Summary**: Write a 2-3 sentence hook that captures the essence and makes readers want to continue
3. **Content Structure**: 
   - Break content into digestible sections with clear, engaging headings
   - Use storytelling techniques to maintain interest
   - Add transitions between sections for smooth flow
   - Highlight key findings or takeaways
   - Simplify jargon without losing meaning
4. **Formatting**: Use HTML tags appropriately (<h2>, <h3>, <p>, <strong>, <em>, <ul>, <ol>, <li>, <blockquote>)
5. **Tags**: Generate 5-8 relevant tags covering topics, themes, and keywords
6. **Tone**: Professional yet conversational, informative yet engaging
7. **Thumbnail**: The first image extracted will be used as the blog thumbnail, so ensure it's placed in a section that's relevant to the overall theme

**IMPORTANT - Image Placement Instructions:**
${extraction.images.length > 0 ? `
You have ${extraction.images.length} images extracted from the document. I will show you these images along with their page numbers.

**Available Images:**
${imageReferences}

**How to Use Images:**
- Analyze each image I show you and understand its context from the page it appears on
- ${logoIndices.length > 0 ? `**CRITICAL: Image(s) ${logoIndices.map(i => i + 1).join(', ')} are LOGO(S). DO NOT include indices ${logoIndices.join(', ')} in any section's "images" array.**` : ''}
- Place images in the "images" array of the section where they are most relevant
- Reference images by their number (0-indexed): Use index 0 for Image 1, index 1 for Image 2, etc.
- Match images to the paragraph/section content they relate to based on:
  * The page number where the image appears
  * The content topic discussed in that section
  * Visual relevance to the text
- Each section can have multiple images if relevant
- Don't place all images in one section - distribute them based on content relevance
- If an image shows data/graphs, place it near the discussion of that data
- If an image shows diagrams/illustrations, place it where that concept is explained

Example: If Image 1 is from page 3 and shows a chart about results, place it in the section discussing those results:
{
  "heading": "Research Results",
  "content": "<p>The study revealed significant findings...</p>",
  "images": [0]  // This references Image 1 (index 0)
}
` : '- No images available for this document'}

**Content to Transform:**
${this.formatLayoutForPrompt(extraction.layout)}

**Output Format (JSON):**
{
  "title": "Compelling Blog Post Title",
  "summary": "Engaging 2-3 sentence introduction that hooks the reader",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "sections": [
    {
      "heading": "Engaging Section Title",
      "content": "<p>Well-formatted HTML content with proper tags. Use <strong> for emphasis, <em> for subtle emphasis, <ul> or <ol> for lists, and <blockquote> for important quotes or findings.</p>",
      "images": [0, 2]
    }
  ]
}

IMPORTANT: 
- Respond ONLY with valid JSON. No additional text before or after.
- The "images" array should contain indices (numbers) of images to display in that section
- Place images thoughtfully based on their page numbers and content relevance`;
        }

        private formatLayoutForPrompt(layout: LayoutSection[]): string {
                let currentPage = 0;
                return layout
                        .map((section) => {
                                let output = '';

                                // Add page marker when page changes
                                if (section.pageNumber > currentPage) {
                                        currentPage = section.pageNumber;
                                        output += `\n--- Page ${currentPage} ---\n`;
                                }

                                if (section.type === 'heading') {
                                        output += `\n## ${section.content}\n`;
                                } else {
                                        output += section.content;
                                }

                                return output;
                        })
                        .join('\n');
        }

        private buildParts(extraction: PDFExtractionResult, prompt: string, logoIndices: number[] = []): Part[] {
                const parts: Part[] = [{ text: prompt }];

                // Add images if available (only if they have actual data), excluding logos
                extraction.images.forEach((img, index) => {
                        if (img.data && !logoIndices.includes(index)) { // Skip logo images
                                parts.push({
                                        inlineData: {
                                                mimeType: img.mimeType,
                                                data: img.data,
                                        },
                                });
                                parts.push({
                                        text: `[Image ${index + 1} from page ${img.page}]`,
                                });
                        }
                });

                return parts;
        }

        private parseResponse(text: string, logoIndices: number[] = []): BlogConversionResult {
                try {
                        // Remove markdown code block if present
                        let jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

                        // Try to find JSON object boundaries if response has extra text
                        const firstBrace = jsonText.indexOf('{');
                        const lastBrace = jsonText.lastIndexOf('}');

                        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                                jsonText = jsonText.substring(firstBrace, lastBrace + 1);
                        }

                        // Attempt to parse
                        let parsed;
                        try {
                                parsed = JSON.parse(jsonText);
                        } catch (parseError) {
                                // If JSON is malformed, try to fix common issues
                                logger.warn('Initial JSON parse failed, attempting repair...');

                                // Log the problematic JSON for debugging
                                logger.debug('Problematic JSON (first 1000 chars):', jsonText.substring(0, 1000));
                                logger.debug('Problematic JSON (last 1000 chars):', jsonText.substring(jsonText.length - 1000));

                                // Try to fix incomplete JSON by truncating at last complete field
                                const fixedJson = this.attemptJsonRepair(jsonText);
                                parsed = JSON.parse(fixedJson);
                        }

                        // Filter out logo indices from all sections
                        if (logoIndices.length > 0 && parsed.sections) {
                                parsed.sections = parsed.sections.map((section: BlogSection) => {
                                        if (section.images && section.images.length > 0) {
                                                section.images = section.images.filter((imgIndex: number) => !logoIndices.includes(imgIndex));
                                        }
                                        return section;
                                });
                        }

                        return {
                                title: parsed.title || 'Untitled Blog Post',
                                content: this.sectionsToHTML(parsed.sections, logoIndices),
                                summary: parsed.summary || '',
                                tags: parsed.tags || [],
                                sections: parsed.sections || [],
                        };
                } catch (error) {
                        throw new Error(`Failed to parse Gemini response: ${error instanceof Error ? error.message : String(error)}`);
                }
        }

        private attemptJsonRepair(jsonText: string): string {
                // Remove any trailing incomplete strings or objects
                let repaired = jsonText;

                // If ends with incomplete quote, try to find last complete field
                if (repaired.includes('"') && !repaired.endsWith('}')) {
                        // Find the last complete field before the error
                        const patterns = [
                                /,\s*"[^"]*":\s*"[^"]*$/,  // Incomplete string field
                                /,\s*"[^"]*":\s*\[.*$/,     // Incomplete array
                                /,\s*"[^"]*$/,              // Incomplete key
                        ];

                        for (const pattern of patterns) {
                                const match = repaired.match(pattern);
                                if (match && match.index !== undefined) {
                                        repaired = repaired.substring(0, match.index);
                                        break;
                                }
                        }

                        // Close any open arrays and the main object
                        const openBrackets = (repaired.match(/\[/g) || []).length;
                        const closeBrackets = (repaired.match(/\]/g) || []).length;
                        repaired += ']'.repeat(openBrackets - closeBrackets);

                        if (!repaired.endsWith('}')) {
                                repaired += '}';
                        }
                }

                return repaired;
        }

        private sectionsToHTML(sections: BlogSection[], logoIndices: number[] = []): string {
                return sections
                        .map((section) => {
                                let html = `<h2>${section.heading}</h2>\n<div>${section.content}</div>`;

                                // Add images if present in this section (excluding logos)
                                if (section.images && section.images.length > 0) {
                                        const imageElements = section.images
                                                .filter(imgIndex => !logoIndices.includes(imgIndex)) // Exclude logos
                                                .map(imgIndex => `<img src="{{IMAGE_${imgIndex}}}" alt="Image from section: ${section.heading}" class="blog-image" />`)
                                                .join('\n');
                                        html += `\n${imageElements}`;
                                }

                                return html;
                        })
                        .join('\n');
        }

        async selectBestThumbnail(
                title: string,
                summary: string,
                images: Array<{ data: string; mimeType: string; alt: string; page: number }>,
                imageUrls: string[]
        ): Promise<string | undefined> {
                if (!images.length || !imageUrls.length) {
                        return undefined;
                }

                // If only one image, return it directly
                if (images.length === 1) {
                        return imageUrls[0];
                }

                try {
                        // Wait for rate limit before making request
                        await this.waitForRateLimit();

                        const prompt = `You are an expert content curator. Analyze the following images and select the BEST one to use as a thumbnail for a blog post.

**Blog Title:** ${title}

**Blog Summary:** ${summary}

**Task:** 
Choose the image that:
1. Best represents the main theme or message of the blog post
2. Is visually appealing and would attract readers
3. Correlates most strongly with the title and summary
4. Would make a good cover image (clear subject, good composition)

I will show you ${images.length} images. Each image will be labeled with its index number.

**Available Images:**
${images.map((img, idx) => `- Image ${idx}: From page ${img.page}, ${img.alt}`).join('\n')}

**Important:** Respond with ONLY the index number (0 to ${images.length - 1}) of the best thumbnail image. No other text.`;

                        const parts: Part[] = [{ text: prompt }];

                        // Add all images with labels
                        images.forEach((img, index) => {
                                parts.push({
                                        inlineData: {
                                                mimeType: img.mimeType,
                                                data: img.data,
                                        },
                                });
                                parts.push({
                                        text: `[This is Image ${index}]`,
                                });
                        });

                        const result = await this.model.generateContent(parts);
                        const response = await result.response;
                        const text = response.text().trim();

                        // Parse the response to get the index
                        const selectedIndex = parseInt(text, 10);

                        if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= imageUrls.length) {
                                logger.warn(`Invalid thumbnail selection: ${text}. Using first image.`);
                                return imageUrls[0];
                        }

                        logger.debug(`✓ Gemini AI selected image ${selectedIndex} as best thumbnail`);
                        return imageUrls[selectedIndex];
                } catch (error) {
                        logger.error('Error selecting thumbnail with Gemini:', error);
                        // Fallback to first image
                        return imageUrls[0];
                }
        }

        async detectLogo(
                images: Array<{ data: string; mimeType: string; alt: string; page: number; width?: number; height?: number }>,
                imageUrls: string[]
        ): Promise<number[]> {
                if (!images.length || !imageUrls.length) {
                        return [];
                }

                try {
                        // Wait for rate limit before making request
                        await this.waitForRateLimit();

                        // Use a model without JSON response format for simple classification
                        const visionModel = this.genAI.getGenerativeModel({
                                model: 'gemini-2.0-flash-exp',
                                generationConfig: {
                                        temperature: 0.3,
                                        topK: 20,
                                        topP: 0.8,
                                        maxOutputTokens: 50,
                                        // No responseMimeType - allow plain text
                                },
                        });

                        const prompt = `You are an expert at identifying logos in academic papers and documents.

**Task:** Analyze the following images and identify ALL logos (company logo, organization logo, institution logo, university logo, etc.). There may be MULTIPLE logos.

**Logo Characteristics:**
1. Usually appears on the first page (header or footer)
2. Small to medium size (typically not full-page images)
3. Contains text/branding/symbols representing an organization
4. Simple, clean design focused on branding
5. May include university emblems, institutional seals, or corporate logos
6. NOT author photos or headshots
7. NOT data visualizations, charts, graphs, or content images
8. NOT illustration diagrams or figures

**Anti-patterns (NOT logos):**
- Photos of people (even if small and on page 1)
- Portrait photos or headshots
- Photographs of places or things
- Diagrams, flowcharts, or technical illustrations
- Charts and graphs

I will show you ${images.length} images from a document. Each image will be labeled with its:
- Index number
- Page number where it appears
- Dimensions (width x height)

**Available Images:**
${images.map((img, idx) => `- Image ${idx}: Page ${img.page}, Size: ${img.width || 'unknown'}x${img.height || 'unknown'}px`).join('\n')}

**CRITICAL INSTRUCTIONS:**
1. Look carefully at each image's actual content
2. Distinguish between logos and photos/portraits
3. You can identify MULTIPLE logos if they exist
4. Respond with COMMA-SEPARATED INDEX NUMBERS (nothing else):
   - If you find logo(s): respond with index number(s) separated by commas
   - If NO logo is found: respond with -1
   
Example responses:
0
0,1
1,3
-1

**Your response (comma-separated numbers only):**`;

                        const parts: Part[] = [{ text: prompt }];

                        // Add all images with labels
                        images.forEach((img, index) => {
                                parts.push({
                                        inlineData: {
                                                mimeType: img.mimeType,
                                                data: img.data,
                                        },
                                });
                                parts.push({
                                        text: `[This is Image ${index} from page ${img.page}, dimensions: ${img.width || '?'}x${img.height || '?'}]`,
                                });
                        });

                        const result = await visionModel.generateContent(parts);
                        const response = await result.response;
                        let text = response.text().trim();

                        logger.debug(`Logo detection raw response: "${text}"`);

                        // Try to extract numbers from response (handle various formats)
                        // Remove any JSON formatting if present
                        text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                        
                        // Try to parse as JSON first
                        let logoIndices: number[] = [];
                        try {
                                // Handle array of objects with label: "logo"
                                if (text.startsWith('[')) {
                                        const jsonArray = JSON.parse(text);
                                        // This is object detection format - ignore it
                                        logger.debug('AI returned object detection format instead of index numbers - ignoring');
                                        logoIndices = [];
                                } else {
                                        // Extract comma-separated numbers or single number
                                        const numbers = text.match(/-?\d+/g);
                                        if (numbers) {
                                                logoIndices = numbers.map(n => parseInt(n, 10)).filter(n => !isNaN(n));
                                        }
                                }
                        } catch (e) {
                                logger.debug('Error parsing logo detection response:', e);
                        }

                        // Filter out -1 and invalid indices
                        logoIndices = logoIndices.filter(idx => idx >= 0 && idx < images.length);

                        if (logoIndices.length === 0) {
                                logger.debug('No logos detected');
                                return [];
                        }

                        // Additional validation: logos should typically be small and on page 1
                        const validatedLogos = logoIndices.filter(logoIndex => {
                                const detectedImage = images[logoIndex];
                                const isSmall = (detectedImage.width || 0) < 300 && (detectedImage.height || 0) < 300;
                                const isOnPageOne = detectedImage.page === 1;
                                
                                if (!isOnPageOne && !isSmall) {
                                        logger.warn(`AI detected logo at index ${logoIndex} (page ${detectedImage.page}, ${detectedImage.width}x${detectedImage.height}), but it doesn't match typical logo characteristics. Ignoring.`);
                                        return false;
                                }
                                return true;
                        });

                        if (validatedLogos.length > 0) {
                                logger.debug(`✓ Gemini AI detected ${validatedLogos.length} logo(s) at indices: ${validatedLogos.join(', ')}`);
                        }
                        
                        return validatedLogos;
                } catch (error) {
                        logger.error('Error detecting logo with Gemini:', error);
                        return [];
                }
        }
}
