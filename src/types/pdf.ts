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
}

export interface PDFMetadata {
        title?: string;
        author?: string;
        pages: number;
        creationDate?: Date;
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
