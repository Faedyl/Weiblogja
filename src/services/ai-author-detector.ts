import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '@/lib/logger';

export interface DetectedAuthor {
        name: string;
        affiliation?: string;
        email?: string;
        confidence: number; // 0-100
}

export interface AuthorDetectionResult {
        authors: DetectedAuthor[];
        source: 'metadata' | 'ai_extraction' | 'both';
        totalAuthorsFound: number;
}

export class AIAuthorDetector {
        private genAI: GoogleGenerativeAI | null = null;
        private model: ReturnType<GoogleGenerativeAI['getGenerativeModel']> | null = null;
        private maxRetries = 2;
        private baseDelay = 1000; // 1 second
        private openRouterApiKey?: string;
        private static lastRequestTime = 0;
        private static minRequestInterval = 4000; // 4 seconds between requests (15 RPM = 4s interval)

        constructor(apiKey: string, openRouterApiKey?: string) {
                if (apiKey) {
                        this.genAI = new GoogleGenerativeAI(apiKey);
                        this.model = this.genAI.getGenerativeModel({
                                model: 'gemini-2.0-flash-lite',
                                generationConfig: {
                                        temperature: 0.3, // Lower temperature for more accurate extraction
                                        topK: 40,
                                        topP: 0.95,
                                        maxOutputTokens: 2048,
                                        responseMimeType: 'application/json',
                                },
                        });
                }
                this.openRouterApiKey = openRouterApiKey;
        }

        /**
         * Delay helper for retry mechanism
         */
        private async delay(ms: number): Promise<void> {
                return new Promise(resolve => setTimeout(resolve, ms));
        }

        /**
         * Wait to respect rate limits (static to work across all instances)
         */
        private async waitForRateLimit(): Promise<void> {
                const now = Date.now();
                const timeSinceLastRequest = now - AIAuthorDetector.lastRequestTime;
                
                if (timeSinceLastRequest < AIAuthorDetector.minRequestInterval) {
                        const waitTime = AIAuthorDetector.minRequestInterval - timeSinceLastRequest;
                        logger.debug(`⏱️ Rate limiting: waiting ${waitTime}ms before next request`);
                        await this.delay(waitTime);
                }
                
                AIAuthorDetector.lastRequestTime = Date.now();
        }

        /**
         * Detect authors from PDF using AI
         * Returns up to 3 main authors with their information
         */
        async detectAuthors(
                pdfText: string,
                metadataAuthor?: string
        ): Promise<AuthorDetectionResult> {
                try {
                        const metadataAuthors = this.parseMetadataAuthors(metadataAuthor);

                        // Always use AI for better accuracy, even if metadata exists
                        logger.debug('Using AI to extract authors from PDF content...');
                        const aiAuthors = await this.extractAuthorsWithAI(pdfText);

                        // Merge results: prioritize AI if confidence is high, otherwise use metadata
                        const mergedAuthors = this.mergeAuthorResults(metadataAuthors, aiAuthors);

                        const source = this.determineSource(metadataAuthors, aiAuthors, mergedAuthors);

                        return {
                                authors: mergedAuthors.slice(0, 3), // Return top 3 authors
                                source,
                                totalAuthorsFound: mergedAuthors.length,
                        };
                } catch (error) {
                        logger.error('AI author detection error:', error);

                        // Fallback to metadata if AI fails
                        if (metadataAuthor) {
                                const fallbackAuthors = this.parseMetadataAuthors(metadataAuthor);
                                if (fallbackAuthors.length > 0) {
                                        return {
                                                authors: fallbackAuthors.slice(0, 3),
                                                source: 'metadata',
                                                totalAuthorsFound: fallbackAuthors.length,
                                        };
                                }
                        }

                        // Return empty result instead of throwing - let the upload route handle it
                        return {
                                authors: [],
                                source: 'metadata',
                                totalAuthorsFound: 0,
                        };
                }
        }

        /**
         * Use Gemini AI to extract authors from PDF content
         */
        private async extractAuthorsWithAI(pdfText: string): Promise<DetectedAuthor[]> {
                // Try Gemini first
                if (this.model) {
                        try {
                                return await this.extractAuthorsWithGemini(pdfText);
                        } catch (error: any) {
                                logger.warn('Gemini author extraction failed, trying OpenRouter fallback...', error);
                        }
                }

                // Fallback to OpenRouter if Gemini fails or is not available
                if (this.openRouterApiKey) {
                        try {
                                return await this.extractAuthorsWithOpenRouter(pdfText);
                        } catch (error) {
                                logger.error('OpenRouter author extraction also failed:', error);
                        }
                }

                // All methods failed
                return [];
        }

        /**
         * Extract authors using Gemini
         */
        private async extractAuthorsWithGemini(pdfText: string): Promise<DetectedAuthor[]> {
                if (!this.model) {
                        throw new Error('Gemini model not initialized');
                }
                
                // Wait for rate limit before making request
                await this.waitForRateLimit();
                
                // Take first 2000 characters (approximately first page) where authors are typically listed
                // This is more token-efficient since authors are almost always on the first page
                const contentSample = pdfText.substring(0, 2000);

                const prompt = `You are an expert at extracting author information from academic papers and journal articles.

**Task:** Extract ALL author names from this PDF content. Authors are typically listed at the beginning of academic papers.

**PDF Content (first page):**
${contentSample}

**Instructions:**
1. Find ALL author names listed in the document
2. Extract their full names (first name and last name)
3. Extract affiliations if mentioned (university, institution, department)
4. Extract email addresses if mentioned
5. List authors in the ORDER they appear in the document
6. Assign confidence score (0-100) based on:
   - 100: Name explicitly labeled as "Author:", "By:", or in author section
   - 90: Name appears in typical author position (after title, before abstract)
   - 80: Name with affiliation/email nearby
   - 70: Name appears in first page but position unclear
   - 50: Uncertain if person is an author

**Common Author Patterns:**
- "Authors: John Smith, Jane Doe"
- "By John Smith and Jane Doe"
- "John Smith¹, Jane Doe²" (with superscript affiliations)
- "John Smith (john@university.edu)"
- "John Smith, Department of Computer Science"
- "Corresponding author: John Smith"

**Output Format (JSON array):**
[
  {
    "name": "Full Name",
    "affiliation": "University/Institution (if found)",
    "email": "email@domain.com (if found)",
    "confidence": 95
  }
]

**Important:**
- Return up to 10 authors (if more exist, prioritize by confidence)
- Do NOT include editors, reviewers, or cited authors
- Only include people who are actual authors of THIS paper
- If no authors found, return empty array []
- Respond ONLY with valid JSON array, no additional text`;

                // Retry logic with exponential backoff
                let lastError: any;
                for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
                        try {
                                if (attempt > 0) {
                                        const delayMs = this.baseDelay * Math.pow(2, attempt - 1);
                                        logger.debug(`Retrying AI author extraction (attempt ${attempt + 1}/${this.maxRetries + 1}) after ${delayMs}ms delay...`);
                                        await this.delay(delayMs);
                                }

                                const result = await this.model.generateContent(prompt);
                                const response = await result.response;
                                const text = response.text();

                                logger.debug('AI author extraction response:', text.substring(0, 500));

                                // Parse AI response - handle various response formats
                                let parsed;
                                try {
                                        parsed = JSON.parse(text);
                                } catch (parseError) {
                                        // Try to extract JSON array from markdown code blocks
                                        const jsonMatch = text.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
                                        if (jsonMatch) {
                                                parsed = JSON.parse(jsonMatch[1]);
                                        } else {
                                                // Try to find any JSON array in the text
                                                const arrayMatch = text.match(/\[[\s\S]*\]/);
                                                if (arrayMatch) {
                                                        parsed = JSON.parse(arrayMatch[0]);
                                                } else {
                                                        logger.warn('Could not extract JSON from AI response');
                                                        return [];
                                                }
                                        }
                                }

                                if (!Array.isArray(parsed)) {
                                        logger.warn('AI returned non-array response, trying to extract array');
                                        return [];
                                }

                                // Validate and clean results
                                const validAuthors: DetectedAuthor[] = parsed
                                        .filter((author: any) => author.name && author.name.trim().length > 0)
                                        .map((author: any) => ({
                                                name: author.name.trim(),
                                                affiliation: author.affiliation?.trim() || undefined,
                                                email: author.email?.trim() || undefined,
                                                confidence: Math.min(100, Math.max(0, author.confidence || 50)),
                                        }))
                                        .sort((a: DetectedAuthor, b: DetectedAuthor) => b.confidence - a.confidence); // Sort by confidence

                                        logger.debug(`AI detected ${validAuthors.length} authors`);
                                        return validAuthors;
                        } catch (error: any) {
                                lastError = error;
                                
                                // Check if it's a rate limit error (429)
                                const isRateLimit = error?.status === 429 || 
                                                   error?.message?.includes('429') ||
                                                   error?.message?.includes('quota') ||
                                                   error?.message?.includes('rate limit');

                                if (isRateLimit && attempt < this.maxRetries) {
                                        logger.warn(`Rate limit hit, will retry (attempt ${attempt + 1}/${this.maxRetries + 1})`);
                                        continue;
                                }

                                // For other errors or last attempt, throw to trigger OpenRouter fallback
                                throw lastError;
                        }
                }

                // All retries failed, throw to trigger fallback
                throw lastError || new Error('Gemini author extraction failed after retries');
        }

        /**
         * Extract authors using OpenRouter as fallback
         */
        private async extractAuthorsWithOpenRouter(pdfText: string): Promise<DetectedAuthor[]> {
                if (!this.openRouterApiKey) {
                        throw new Error('OpenRouter API key not configured');
                }

                // Wait for rate limit before making request
                await this.waitForRateLimit();

                const contentSample = pdfText.substring(0, 2000);

                const prompt = `You are an expert at extracting author information from academic papers and journal articles.

**Task:** Extract ALL author names from this PDF content. Authors are typically listed at the beginning of academic papers.

**PDF Content (first page):**
${contentSample}

**Instructions:**
1. Find ALL author names listed in the document
2. Extract their full names (first name and last name)
3. Extract affiliations if mentioned (university, institution, department)
4. Extract email addresses if mentioned
5. List authors in the ORDER they appear in the document
6. Assign confidence score (0-100) based on:
   - 100: Name explicitly labeled as "Author:", "By:", or in author section
   - 90: Name appears in typical author position (after title, before abstract)
   - 80: Name with affiliation/email nearby
   - 70: Name appears in first page but position unclear
   - 50: Uncertain if person is an author

**Output Format (JSON array):**
[
  {
    "name": "Full Name",
    "affiliation": "University/Institution (if found)",
    "email": "email@domain.com (if found)",
    "confidence": 95
  }
]

**Important:**
- Return up to 10 authors (if more exist, prioritize by confidence)
- Do NOT include editors, reviewers, or cited authors
- Only include people who are actual authors of THIS paper
- If no authors found, return empty array []
- Respond ONLY with valid JSON array, no additional text`;

                try {
                        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                                method: 'POST',
                                headers: {
                                        'Authorization': `Bearer ${this.openRouterApiKey}`,
                                        'Content-Type': 'application/json',
                                        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
                                        'X-Title': 'Weiblogja PDF Converter'
                                },
                                body: JSON.stringify({
                                        model: 'meta-llama/llama-3.2-3b-instruct:free',
                                        messages: [{ role: 'user', content: prompt }],
                                        temperature: 0.3,
                                        max_tokens: 2048,
                                        response_format: { type: 'json_object' }
                                })
                        });

                        if (!response.ok) {
                                const errorText = await response.text();
                                throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
                        }

                        const data = await response.json();
                        const text = data.choices[0]?.message?.content || '[]';

                        logger.debug('OpenRouter author extraction response:', text.substring(0, 500));

                        let parsed;
                        try {
                                parsed = JSON.parse(text);
                        } catch (parseError) {
                                // Try to extract JSON from the response
                                const arrayMatch = text.match(/\[[\s\S]*\]/);
                                if (arrayMatch) {
                                        parsed = JSON.parse(arrayMatch[0]);
                                } else {
                                        logger.warn('Could not extract JSON from OpenRouter response');
                                        return [];
                                }
                        }

                        // Handle different response formats
                        let authorsArray: any[];
                        if (Array.isArray(parsed)) {
                                authorsArray = parsed;
                        } else if (parsed.authors && Array.isArray(parsed.authors)) {
                                // OpenRouter might return an object with an array property
                                authorsArray = parsed.authors;
                        } else if (parsed.name) {
                                // OpenRouter returned a single author object, wrap it in an array
                                logger.debug('OpenRouter returned single author object, wrapping in array');
                                authorsArray = [parsed];
                        } else {
                                logger.warn('OpenRouter returned unrecognized format:', JSON.stringify(parsed).substring(0, 200));
                                return [];
                        }

                        const validAuthors: DetectedAuthor[] = authorsArray
                                .filter((author: any) => author.name && author.name.trim().length > 0)
                                .map((author: any) => ({
                                        name: author.name.trim(),
                                        affiliation: author.affiliation?.trim() || undefined,
                                        email: author.email?.trim() || undefined,
                                        confidence: Math.min(100, Math.max(0, author.confidence || 50)),
                                }))
                                .sort((a: DetectedAuthor, b: DetectedAuthor) => b.confidence - a.confidence);

                        logger.info(`✓ OpenRouter detected ${validAuthors.length} authors`);
                        return validAuthors;
                } catch (error) {
                        logger.error('OpenRouter author extraction error:', error);
                        throw error;
                }
        }

        /**
         * Parse authors from PDF metadata
         */
        private parseMetadataAuthors(metadataAuthor?: string): DetectedAuthor[] {
                if (!metadataAuthor || metadataAuthor.trim() === '') {
                        return [];
                }

                // Filter out common invalid author values
                const invalidPatterns = [
                        /^corresponding\s*(email|author)?$/i,
                        /^email$/i,
                        /^author$/i,
                        /^unknown$/i,
                        /^n\/a$/i,
                        /^\s*$/,
                ];

                const isInvalid = invalidPatterns.some(pattern => pattern.test(metadataAuthor.trim()));
                if (isInvalid) {
                        logger.debug(`Filtering out invalid metadata author: "${metadataAuthor}"`);
                        return [];
                }

                // Split by common delimiters
                const authorList = metadataAuthor.split(/[,;]|\band\b|&/).map(a => a.trim());

                return authorList
                        .filter(name => {
                                // Must have at least 2 characters and not match invalid patterns
                                if (name.length < 2) return false;
                                return !invalidPatterns.some(pattern => pattern.test(name));
                        })
                        .map(name => ({
                                name: name.trim(),
                                confidence: 70, // Metadata confidence is medium (can be outdated or incomplete)
                        }))
                        .slice(0, 3); // Take first 3 from metadata
        }

        /**
         * Merge metadata and AI results
         * Prioritize AI if confidence is high, otherwise combine both
         */
        private mergeAuthorResults(
                metadataAuthors: DetectedAuthor[],
                aiAuthors: DetectedAuthor[]
        ): DetectedAuthor[] {
                // If AI found high-confidence authors, use them
                if (aiAuthors.length > 0 && aiAuthors[0].confidence >= 80) {
                        logger.debug('Using AI-detected authors (high confidence)');
                        return aiAuthors;
                }

                // If metadata exists and AI found nothing or low confidence
                if (metadataAuthors.length > 0 && (aiAuthors.length === 0 || aiAuthors[0].confidence < 70)) {
                        logger.debug('Using metadata authors (AI confidence too low)');
                        return metadataAuthors;
                }

                // Combine both: deduplicate by name similarity
                const combined = [...aiAuthors];

                for (const metaAuthor of metadataAuthors) {
                        const isDuplicate = combined.some(aiAuthor =>
                                this.isSamePerson(aiAuthor.name, metaAuthor.name)
                        );

                        if (!isDuplicate) {
                                combined.push(metaAuthor);
                        }
                }

                // Sort by confidence
                return combined.sort((a, b) => b.confidence - a.confidence);
        }

        /**
         * Check if two names refer to the same person
         */
        private isSamePerson(name1: string, name2: string): boolean {
                const normalize = (name: string) => name.toLowerCase().replace(/[.,]/g, '').trim();
                const n1 = normalize(name1);
                const n2 = normalize(name2);

                // Exact match
                if (n1 === n2) return true;

                // One contains the other
                if (n1.includes(n2) || n2.includes(n1)) return true;

                // Check initials match (e.g., "J. Smith" vs "John Smith")
                const parts1 = n1.split(/\s+/);
                const parts2 = n2.split(/\s+/);

                if (parts1.length >= 2 && parts2.length >= 2) {
                        const lastName1 = parts1[parts1.length - 1];
                        const lastName2 = parts2[parts2.length - 1];

                        // Same last name
                        if (lastName1 === lastName2) {
                                const firstInitial1 = parts1[0].charAt(0);
                                const firstInitial2 = parts2[0].charAt(0);

                                // Same first initial
                                if (firstInitial1 === firstInitial2) {
                                        return true;
                                }
                        }
                }

                return false;
        }

        /**
         * Determine the source of author information
         */
        private determineSource(
                metadataAuthors: DetectedAuthor[],
                aiAuthors: DetectedAuthor[],
                mergedAuthors: DetectedAuthor[]
        ): 'metadata' | 'ai_extraction' | 'both' {
                const hasMetadata = metadataAuthors.length > 0;
                const hasAI = aiAuthors.length > 0;

                if (hasMetadata && hasAI) return 'both';
                if (hasAI) return 'ai_extraction';
                return 'metadata';
        }

        /**
         * Format authors as a readable string
         */
        static formatAuthors(authors: DetectedAuthor[]): string {
                if (authors.length === 0) return '';
                if (authors.length === 1) return authors[0].name;
                if (authors.length === 2) return `${authors[0].name} and ${authors[1].name}`;

                // For 3+ authors, list first 3
                const first3 = authors.slice(0, 3).map(a => a.name);
                if (authors.length > 3) {
                        return `${first3.join(', ')}, et al.`;
                }
                return `${first3.slice(0, -1).join(', ')}, and ${first3[first3.length - 1]}`;
        }

        /**
         * Check if a user is one of the detected authors
         */
        static isUserAnAuthor(
                detectedAuthors: DetectedAuthor[],
                userName: string,
                userEmail: string,
                alternativeNames: string[] = []
        ): { isAuthor: boolean; matchedAuthor?: DetectedAuthor; matchType?: string } {
                const normalizeUserName = userName.toLowerCase().trim();
                const normalizeUserEmail = userEmail.toLowerCase().trim();

                for (const author of detectedAuthors) {
                        const normalizedAuthorName = author.name.toLowerCase().trim();
                        const normalizedAuthorEmail = author.email?.toLowerCase().trim();

                        // Exact name match
                        if (normalizedAuthorName === normalizeUserName) {
                                return { isAuthor: true, matchedAuthor: author, matchType: 'exact_name' };
                        }

                        // Author name contains user name
                        if (normalizedAuthorName.includes(normalizeUserName)) {
                                return { isAuthor: true, matchedAuthor: author, matchType: 'name_contained' };
                        }

                        // User name contains author name (e.g., "Dr. John Smith" contains "John Smith")
                        if (normalizeUserName.includes(normalizedAuthorName)) {
                                return { isAuthor: true, matchedAuthor: author, matchType: 'name_contained_reverse' };
                        }

                        // Email match
                        if (normalizedAuthorEmail && normalizedAuthorEmail === normalizeUserEmail) {
                                return { isAuthor: true, matchedAuthor: author, matchType: 'email_match' };
                        }

                        // Alternative names
                        for (const altName of alternativeNames) {
                                const normalizedAltName = altName.toLowerCase().trim();
                                if (normalizedAuthorName === normalizedAltName ||
                                        normalizedAuthorName.includes(normalizedAltName)) {
                                        return { isAuthor: true, matchedAuthor: author, matchType: 'alternative_name' };
                                }
                        }

                        // Check initials (e.g., "J. Smith" vs "John Smith")
                        if (this.checkInitialsMatch(normalizeUserName, normalizedAuthorName)) {
                                return { isAuthor: true, matchedAuthor: author, matchType: 'initials_match' };
                        }
                }

                return { isAuthor: false };
        }

        /**
         * Check if names match by initials
         */
        private static checkInitialsMatch(name1: string, name2: string): boolean {
                const parts1 = name1.split(/\s+/);
                const parts2 = name2.split(/\s+/);

                if (parts1.length < 2 || parts2.length < 2) return false;

                // Same last name
                const lastName1 = parts1[parts1.length - 1];
                const lastName2 = parts2[parts2.length - 1];

                if (lastName1 !== lastName2) return false;

                // Check if first name/initial matches
                const first1 = parts1[0];
                const first2 = parts2[0];

                // One is initial, other is full name
                if ((first1.length <= 2 && first1.charAt(0) === first2.charAt(0)) ||
                        (first2.length <= 2 && first2.charAt(0) === first1.charAt(0))) {
                        return true;
                }

                return false;
        }
}
