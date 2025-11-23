# API Reference

## Authentication

All API routes use NextAuth.js for authentication. Protected routes require a valid session.

## Endpoints

### PDF Upload and Conversion

#### POST /api/pdf/upload

Upload a PDF file and convert it to a blog post using AI.

**Request:**
```typescript
Content-Type: multipart/form-data

{
  file: File (PDF, max 50MB)
}
```

**Response:**
```typescript
{
  success: boolean,
  conversionId: string,
  result: {
    title: string,
    content: string,
    summary: string,
    tags: string[],
    imageUrls: string[],
    thumbnailUrl?: string
  },
  metadata: {
    title?: string,
    author?: string,
    pages: number,
    creationDate?: string
  },
  imageCount: number
}
```

**Error Response:**
```typescript
{
  error: string
}
```

**Status Codes:**
- 200: Success
- 400: Invalid file type or size
- 500: Server error

### Image Upload

#### POST /api/upload

Generate a presigned URL for uploading images to S3.

**Request:**
```typescript
{
  fileName: string,
  fileType: string,
  directory: "thumbnails" | "content",
  authorId: string,
  blogSlug?: string
}
```

**Response:**
```typescript
{
  success: boolean,
  uploadUrl: string,
  key: string,
  publicUrl: string,
  directory: string,
  fileType: string,
  timestamp: string
}
```

**Error Response:**
```typescript
{
  error: string,
  details?: string
}
```

**Status Codes:**
- 200: Success
- 400: Missing required fields
- 500: Server error

### Authentication

#### POST /api/auth/signin

Sign in with credentials.

**Request:**
```typescript
{
  email: string,
  password: string
}
```

#### POST /api/auth/signup

Register a new user.

**Request:**
```typescript
{
  email: string,
  password: string,
  name: string
}
```

#### POST /api/auth/signout

Sign out the current user.

### Database Test

#### GET /api/test-db

Test DynamoDB connection and create sample data.

**Response:**
```typescript
{
  connection: {
    success: boolean,
    message: string,
    table: string,
    timestamp: string,
    data?: any
  },
  sampleBlogs: {
    success: boolean,
    message: string,
    blogs?: any[]
  }
}
```

## Data Models

### Blog Post

```typescript
interface BlogPost {
  PK: string,              // BLOG#<slug>
  SK: string,              // METADATA
  GSI1PK: string,          // AUTHOR#<author_id>
  GSI1SK: string,          // <created_at>
  title: string,
  content: string,
  summary?: string,
  author_id: string,
  category?: string,
  tags?: string[],
  status: "draft" | "published",
  created_at: string,
  updated_at: string,
  views: number,
  ai_generated: boolean,
  slug: string,
  thumbnail_url?: string,
  images?: Array<{
    url: string,
    alt: string,
    caption?: string,
    position: number
  }>
}
```

### User

```typescript
interface User {
  PK: string,              // USER#<email>
  SK: string,              // PROFILE
  email: string,
  name: string,
  password: string,        // Hashed
  role: "visitor" | "author",
  created_at: string
}
```

### PDF Extraction Result

```typescript
interface PDFExtractionResult {
  text: string,
  images: ExtractedImage[],
  metadata: {
    title?: string,
    author?: string,
    pages: number,
    creationDate?: string
  },
  layout: LayoutSection[]
}

interface ExtractedImage {
  data: string,            // Base64 encoded
  alt: string,
  page: number,
  position: number,
  mimeType: string,
  width?: number,
  height?: number
}

interface LayoutSection {
  type: "heading" | "paragraph",
  content: string,
  level?: number,
  pageNumber: number
}
```

### Blog Conversion Result

```typescript
interface BlogConversionResult {
  title: string,
  content: string,         // HTML formatted
  summary: string,
  tags: string[],
  sections: BlogSection[],
  thumbnailUrl?: string
}

interface BlogSection {
  heading: string,
  content: string,         // HTML formatted
  images?: number[]        // Indices of images to display
}
```

## Error Handling

All API endpoints return consistent error responses:

```typescript
{
  error: string,           // Error message
  details?: string         // Additional error details
}
```

## Rate Limiting

No rate limiting is currently implemented. Consider adding rate limiting for production use.

## Authentication Flow

1. User sends credentials to /api/auth/signin
2. Server validates credentials against DynamoDB
3. NextAuth creates a session with JWT token
4. Client receives session cookie
5. Subsequent requests include session cookie for authentication
6. Protected routes verify session before processing

## S3 Upload Flow

1. Client requests presigned URL from /api/upload
2. Server generates presigned URL with temporary credentials
3. Client uploads file directly to S3 using presigned URL
4. S3 returns success response
5. Client uses public URL for displaying images

## PDF Processing Flow

1. Client uploads PDF to /api/pdf/upload
2. Server extracts text and images from PDF
3. Server uploads extracted images to S3
4. Server sends text and images to Gemini AI for conversion
5. Gemini AI generates blog post with structured content
6. Gemini AI selects best thumbnail from extracted images
7. Server returns formatted blog post with S3 image URLs
