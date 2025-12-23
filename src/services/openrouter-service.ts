import { PDFExtractionResult, BlogConversionResult, LayoutSection, BlogSection } from '@/types/pdf';
import { logger } from '@/lib/logger';

export class OpenRouterService {
	private apiKey: string;
	private baseUrl = 'https://openrouter.ai/api/v1';
	private model = 'meta-llama/llama-3.2-3b-instruct:free';
	private static lastRequestTime = 0;
	private static minRequestInterval = 4000; // 4 seconds between requests (15 RPM = 4s interval)

	constructor(apiKey: string) {
		this.apiKey = apiKey;
	}

	/**
	 * Wait to respect rate limits (static to work across all instances)
	 */
	private async waitForRateLimit(): Promise<void> {
		const now = Date.now();
		const timeSinceLastRequest = now - OpenRouterService.lastRequestTime;
		
		if (timeSinceLastRequest < OpenRouterService.minRequestInterval) {
			const waitTime = OpenRouterService.minRequestInterval - timeSinceLastRequest;
			logger.debug(`⏱️ Rate limiting: waiting ${waitTime}ms before next OpenRouter request`);
			await new Promise(resolve => setTimeout(resolve, waitTime));
		}
		
		OpenRouterService.lastRequestTime = Date.now();
	}

	async convertPDFToBlog(
		extraction: PDFExtractionResult,
		imageUrls: string[] = []
	): Promise<BlogConversionResult> {
		try {
			// Detect and extract logo from images FIRST (before content generation)
			let logoUrl: string | undefined;
			let logoIndex = -1;
			if (extraction.images.length > 0 && imageUrls.length > 0) {
				logoIndex = await this.detectLogo(extraction.images, imageUrls);
				if (logoIndex !== -1) {
					logoUrl = imageUrls[logoIndex];
					logger.debug(`✓ Logo detected at index ${logoIndex}: ${logoUrl}`);
				}
			}

			// Wait for rate limit before making request
			await this.waitForRateLimit();
			
			const prompt = this.buildPrompt(extraction, imageUrls, logoIndex);

			const response = await fetch(`${this.baseUrl}/chat/completions`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${this.apiKey}`,
					'Content-Type': 'application/json',
					'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
					'X-Title': 'Weiblogja PDF Converter'
				},
				body: JSON.stringify({
					model: this.model,
					messages: [
						{
							role: 'user',
							content: prompt
						}
					],
					temperature: 0.7,
					max_tokens: 8192,
					response_format: { type: 'json_object' }
				})
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
			}

			const data = await response.json();
			const text = data.choices[0]?.message?.content || '';

			logger.debug('Raw OpenRouter response length:', text.length);
			logger.debug('Raw OpenRouter response preview:', text.substring(0, 500));

			const parsedResult = this.parseResponse(text, logoIndex);

			// Select thumbnail from available images
			if (imageUrls.length > 0) {
				parsedResult.thumbnailUrl = imageUrls[0];
			}

			return {
				...parsedResult,
				logoUrl
			};
		} catch (error) {
			throw new Error(`OpenRouter conversion failed: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	private detectLanguage(text: string): string {
		const sample = text.substring(0, 1000).toLowerCase();

		const indonesianWords = ['dan', 'yang', 'dengan', 'untuk', 'dari', 'pada', 'dalam', 'adalah', 'ini', 'itu', 'dapat', 'akan', 'tidak', 'ada', 'atau'];
		const indonesianCount = indonesianWords.filter(word =>
			new RegExp(`\\b${word}\\b`, 'i').test(sample)
		).length;

		const englishWords = ['the', 'and', 'for', 'with', 'this', 'that', 'from', 'have', 'been', 'which', 'their', 'about'];
		const englishCount = englishWords.filter(word =>
			new RegExp(`\\b${word}\\b`, 'i').test(sample)
		).length;

		if (englishCount > indonesianCount && englishCount >= 3) {
			return 'English';
		}
		return 'Indonesian';
	}

	private getLanguageInstructions(language: string): string {
		if (language === 'English') {
			return `**LANGUAGE**: Write the blog post in ENGLISH (same as the source document).`;
		}
		return `**BAHASA**: Tulis blog post dalam BAHASA INDONESIA. Ini adalah target audiens utama.`;
	}

	private buildPrompt(extraction: PDFExtractionResult, imageUrls: string[] = [], logoIndex: number = -1): string {
		const detectedLanguage = this.detectLanguage(extraction.text);
		const languageInstruction = this.getLanguageInstructions(detectedLanguage);

		const imageReferences = extraction.images
			.map((img, index) => {
				if (index === logoIndex) {
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
- Analyze each image and understand its context from the page it appears on
- ${logoIndex !== -1 ? `**CRITICAL: Image ${logoIndex + 1} is a LOGO. DO NOT include index ${logoIndex} in any section's "images" array.**` : ''}
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
  "images": [0]
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

	private parseResponse(text: string, logoIndex: number = -1): BlogConversionResult {
		try {
			let jsonText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

			const firstBrace = jsonText.indexOf('{');
			const lastBrace = jsonText.lastIndexOf('}');

			if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
				jsonText = jsonText.substring(firstBrace, lastBrace + 1);
			}

			let parsed;
			try {
				parsed = JSON.parse(jsonText);
			} catch (parseError) {
				logger.warn('Initial JSON parse failed, attempting repair...');
				logger.debug('Problematic JSON (first 1000 chars):', jsonText.substring(0, 1000));
				logger.debug('Problematic JSON (last 1000 chars):', jsonText.substring(jsonText.length - 1000));

				const fixedJson = this.attemptJsonRepair(jsonText);
				parsed = JSON.parse(fixedJson);
			}

			// Filter out logo index from all sections
			if (logoIndex !== -1 && parsed.sections) {
				parsed.sections = parsed.sections.map((section: BlogSection) => {
					if (section.images && section.images.length > 0) {
						section.images = section.images.filter((imgIndex: number) => imgIndex !== logoIndex);
					}
					return section;
				});
			}

			return {
				title: parsed.title || 'Untitled Blog Post',
				content: this.sectionsToHTML(parsed.sections, logoIndex),
				summary: parsed.summary || '',
				tags: parsed.tags || [],
				sections: parsed.sections || [],
			};
		} catch (error) {
			throw new Error(`Failed to parse OpenRouter response: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	private attemptJsonRepair(jsonText: string): string {
		let repaired = jsonText;

		if (repaired.includes('"') && !repaired.endsWith('}')) {
			const patterns = [
				/,\s*"[^"]*":\s*"[^"]*$/,
				/,\s*"[^"]*":\s*\[.*$/,
				/,\s*"[^"]*$/,
			];

			for (const pattern of patterns) {
				const match = repaired.match(pattern);
				if (match && match.index !== undefined) {
					repaired = repaired.substring(0, match.index);
					break;
				}
			}

			const openBrackets = (repaired.match(/\[/g) || []).length;
			const closeBrackets = (repaired.match(/\]/g) || []).length;
			repaired += ']'.repeat(openBrackets - closeBrackets);

			if (!repaired.endsWith('}')) {
				repaired += '}';
			}
		}

		return repaired;
	}

	private sectionsToHTML(sections: BlogSection[], logoIndex: number = -1): string {
		return sections
			.map((section) => {
				let html = `<h2>${section.heading}</h2>\n<div>${section.content}</div>`;

				if (section.images && section.images.length > 0) {
					const imageElements = section.images
						.filter(imgIndex => imgIndex !== logoIndex) // Exclude logo
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

		if (images.length === 1) {
			return imageUrls[0];
		}

		try {
			// Wait for rate limit before making request
			await this.waitForRateLimit();
			
			const prompt = `You are an expert content curator. Analyze the following context and select the BEST image index to use as a thumbnail for a blog post.

**Blog Title:** ${title}

**Blog Summary:** ${summary}

**Task:** 
Choose the image that:
1. Best represents the main theme or message of the blog post
2. Is visually appealing and would attract readers
3. Correlates most strongly with the title and summary
4. Would make a good cover image (clear subject, good composition)

**Available Images:**
${images.map((img, idx) => `- Image ${idx}: From page ${img.page}, ${img.alt}`).join('\n')}

**Important:** Respond with ONLY the index number (0 to ${images.length - 1}) of the best thumbnail image. No other text. Output as JSON: {"index": 0}`;

			const response = await fetch(`${this.baseUrl}/chat/completions`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${this.apiKey}`,
					'Content-Type': 'application/json',
					'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
					'X-Title': 'Weiblogja PDF Converter'
				},
				body: JSON.stringify({
					model: this.model,
					messages: [
						{
							role: 'user',
							content: prompt
						}
					],
					temperature: 0.3,
					max_tokens: 100,
					response_format: { type: 'json_object' }
				})
			});

			if (!response.ok) {
				logger.warn('OpenRouter thumbnail selection failed, using first image');
				return imageUrls[0];
			}

			const data = await response.json();
			const text = data.choices[0]?.message?.content || '{"index": 0}';
			
			const parsed = JSON.parse(text);
			const selectedIndex = parseInt(parsed.index, 10);

			if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= imageUrls.length) {
				logger.warn(`Invalid thumbnail selection: ${selectedIndex}. Using first image.`);
				return imageUrls[0];
			}

			logger.debug(`✓ OpenRouter selected image ${selectedIndex} as best thumbnail`);
			return imageUrls[selectedIndex];
		} catch (error) {
			logger.error('Error selecting thumbnail with OpenRouter:', error);
			return imageUrls[0];
		}
	}

	async detectLogo(
		images: Array<{ data: string; mimeType: string; alt: string; page: number; width?: number; height?: number }>,
		imageUrls: string[]
	): Promise<number> {
		// OpenRouter's free Llama model doesn't support vision/image analysis
		// Logo detection requires actual image data, only available with Gemini
		logger.debug('Logo detection not available with OpenRouter (requires Gemini vision API)');
		return -1;
	}
}
