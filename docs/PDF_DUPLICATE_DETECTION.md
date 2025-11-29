# PDF Duplicate Detection

## Overview
The system implements hash-based duplicate detection to prevent the same journal PDF from being uploaded multiple times.

## How It Works

### 1. Hash Generation
When a PDF is uploaded, the system:
- Generates a **SHA-256 hash** of the PDF file content
- This hash is a unique fingerprint of the file
- Even minor changes to the PDF will result in a different hash

### 2. Duplicate Check
Before processing the PDF:
1. **Hash is calculated** from the uploaded file buffer
2. **Database query** searches for existing blogs with the same `pdf_hash`
3. If found, upload is **rejected with 409 Conflict** status
4. User is shown details of the existing blog

### 3. Storage
If the PDF is unique:
- Hash is stored in DynamoDB `BlogPost` table
- Field: `pdf_hash` (SHA-256, 64 characters)
- Linked to the created blog post

## Implementation Details

### Backend (Route: `/api/pdf/upload`)
```typescript
// 1. Generate hash
const pdfHash = crypto.createHash('sha256').update(buffer).digest('hex');

// 2. Check for duplicate
const existingBlog = await getBlogByPdfHash(pdfHash);
if (existingBlog) {
  return NextResponse.json({
    error: 'This PDF has already been uploaded',
    duplicate: true,
    existingBlog: { title, slug, author, createdAt, url }
  }, { status: 409 });
}

// 3. Include hash in response for storage
return NextResponse.json({
  ...result,
  pdfHash
});
```

### Database Function
```typescript
export async function getBlogByPdfHash(pdfHash: string): Promise<BlogPost | null> {
  // Scan DynamoDB for matching pdf_hash
  const command = new ScanCommand({
    TableName: TABLES.BLOGS,
    FilterExpression: "begins_with(PK, :blogPrefix) AND SK = :sk AND pdf_hash = :hash",
    ExpressionAttributeValues: {
      ":blogPrefix": "BLOG#",
      ":sk": "METADATA",
      ":hash": pdfHash
    }
  });
  // Returns existing blog or null
}
```

### Frontend (`/create`)
```typescript
// Handle duplicate error
if (response.status === 409 && error.duplicate) {
  throw new Error(
    `This PDF has already been uploaded!\n\n` +
    `Existing blog: "${error.existingBlog.title}"\n` +
    `View it at: ${error.existingBlog.url}`
  );
}

// Include hash when publishing
const blogData = {
  ...otherFields,
  pdf_hash: result.pdfHash
};
```

## Error Response Format

### Duplicate Detected (409 Conflict)
```json
{
  "error": "This PDF has already been uploaded",
  "duplicate": true,
  "existingBlog": {
    "title": "Existing Blog Title",
    "slug": "existing-blog-title",
    "author": "John Doe",
    "createdAt": "2024-11-27T02:00:00.000Z",
    "url": "/blog/existing-blog-title"
  }
}
```

## Benefits

### ✅ Advantages
1. **Prevents duplicate content** - Same PDF cannot be uploaded twice
2. **Fast detection** - Hash calculated before any processing
3. **Reliable** - Cryptographic hash ensures accuracy
4. **User-friendly** - Shows existing blog details
5. **Cost-effective** - Avoids unnecessary S3 uploads and AI processing

### ⚠️ Limitations
1. **Same content, different file** - If PDF is regenerated with same content but different metadata, it will have a different hash
2. **Minor edits** - Even a 1-byte change creates a different hash
3. **Scan performance** - DynamoDB Scan operation (consider GSI if scale increases)

## Future Enhancements

### Possible Improvements
1. **Content-based similarity** - Use title + author combination as secondary check
2. **DOI extraction** - Use DOI as unique identifier for academic papers
3. **Hash indexing** - Create GSI on `pdf_hash` for faster lookups
4. **Fuzzy matching** - Detect similar PDFs (90%+ identical content)

## Testing

### Manual Test
1. Upload a journal PDF
2. Note the created blog post
3. Upload the **same PDF file** again
4. System should reject with duplicate error
5. Error message should show the existing blog details

### Verify Hash Storage
```bash
# Check DynamoDB for pdf_hash field
aws dynamodb scan \
  --table-name your-table \
  --filter-expression "attribute_exists(pdf_hash)" \
  --projection-expression "title, pdf_hash"
```

## Database Schema

### BlogPost Interface
```typescript
export interface BlogPost {
  // ... other fields
  pdf_url?: string      // S3 URL of original PDF
  pdf_hash?: string     // SHA-256 hash for duplicate detection
}
```

## Monitoring

### Key Metrics
- Number of duplicate upload attempts
- Hash generation time
- Database query performance for hash lookup

### Logs
```
✓ PDF hash is unique, proceeding with upload...
⚠ Duplicate PDF detected! Existing blog: "Title" (slug)
```
