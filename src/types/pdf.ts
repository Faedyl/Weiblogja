export interface PDFExtractionResult {
        text: string;
        images: ExtractedImage[];
        metadata: PDFMetadata;
        layout: LayoutSection[];
}

export interface ExtractedImage {
        data: string; // base64 data or empty
        alt: string;
        page: number; // page number where image is found
        position: number; // position in document
        mimeType: string;
        width?: number;
        height?: number;
        isLogo?: boolean; // Flag to identify if image is a logo
}

export interface PDFMetadata {
        title?: string;
        author?: string;
        pages: number;
        creationDate?: Date;
        authorDetection?: {
                authors: Array<{
                        name: string;
                        affiliation?: string;
                        email?: string;
                        confidence: number;
                }>;
                source: 'metadata' | 'ai_extraction' | 'both';
                totalAuthorsFound: number;
        };
}

export interface LayoutSection {
        type: 'heading' | 'paragraph' | 'image' | 'list';
        content: string;
        level?: number;
        pageNumber: number;
}

export interface BlogConversionResult {
        title: string;
        content: string;
        summary: string;
        tags: string[];
        sections: BlogSection[];
        imageUrls?: string[]; // S3 URLs of extracted images
        thumbnailUrl?: string; // Best image selected as thumbnail
        logoUrl?: string; // Primary logo URL for metadata section (backward compatibility)
        logoUrls?: string[]; // All logo URLs for metadata section
        pdfUrl?: string; // S3 URL of original PDF
        pdfHash?: string; // SHA-256 hash for duplicate detection
}

export interface BlogSection {
        heading: string;
        content: string;
        images?: number[]; // Array of image indices
}

export interface ConversionStatus {
        id: string;
        status: 'uploading' | 'extracting' | 'converting' | 'completed' | 'failed';
        progress: number;
        message: string;
        result?: BlogConversionResult;
        error?: string;
}
