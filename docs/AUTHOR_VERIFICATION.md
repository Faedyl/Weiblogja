# Author Verification System

## Overview
This system ensures that users can only upload journal PDFs that they have authored. This prevents users from uploading journals written by other researchers.

## How It Works

### 1. Authentication Check
- User must be logged in to upload PDFs
- Session is verified using NextAuth

### 2. PDF Metadata Extraction
- System extracts the **Author** field from PDF metadata
- If no author metadata is found, upload is rejected

### 3. Author Verification
The system performs multiple checks to verify if the logged-in user matches the PDF author:

#### Check 1: Exact Name Match
```
PDF Author: "John Smith"
Logged-in User: "John Smith"
✅ VERIFIED
```

#### Check 2: Partial Name Match (with titles/suffixes)
```
PDF Author: "Dr. John Smith, PhD"
Logged-in User: "john smith"
✅ VERIFIED (case-insensitive, titles removed)
```

#### Check 3: Multiple Authors
```
PDF Author: "John Smith, Jane Doe, Bob Lee"
Logged-in User: "Jane Doe"
✅ VERIFIED (user is one of the co-authors)
```

#### Check 4: Initials Match
```
PDF Author: "J. Smith"
Logged-in User: "John Smith"
✅ VERIFIED (first initial + last name match)
```

#### Check 5: Email in Metadata
```
PDF Author: "John Smith (john.smith@university.edu)"
Logged-in User Email: "john.smith@university.edu"
✅ VERIFIED (email found in author field)
```

## Rejection Scenarios

### No Author Metadata
```
PDF Author: (empty)
❌ REJECTED: "PDF does not contain author information"
```

### Different Author
```
PDF Author: "Jane Doe"
Logged-in User: "John Smith"
❌ REJECTED: "Author verification failed. This PDF appears to be authored by 'Jane Doe'"
```

### Not in Co-Author List
```
PDF Author: "Jane Doe, Bob Lee"
Logged-in User: "John Smith"
❌ REJECTED: "You are not listed as an author"
```

## Implementation Details

### Location
- **File**: `/src/app/api/pdf/upload/route.ts`
- **Function**: `verifyAuthor(pdfAuthor, userName, userEmail)`

### Verification Algorithm
1. Normalize both strings (lowercase, trim whitespace)
2. Check exact match
3. Check if user name is contained in PDF author field
4. Split by common separators (comma, semicolon, "and", "&")
5. Remove academic titles (Dr., Prof., PhD, etc.)
6. Check initial + last name pattern
7. Check for email matches
8. Check for institutional domain (optional)

### Security Features
- Session-based authentication required
- Case-insensitive matching
- Handles multiple author formats
- Logs all verification attempts
- Returns descriptive error messages

## Limitations

⚠️ **Important Limitations:**

1. **Metadata can be modified**: A user could potentially edit PDF metadata before uploading
2. **No author metadata**: Some PDFs (especially scanned documents) may not have metadata
3. **Name variations**: Different name spellings or cultural naming conventions may cause false negatives
4. **Institutional PDFs**: PDFs with only institutional authors may be rejected

## Future Enhancements

Consider implementing additional verification methods:

1. **DOI Verification**: Query CrossRef API to verify author list from DOI
2. **ORCID Integration**: Verify using ORCID researcher IDs
3. **Content-based verification**: Extract author emails from PDF content (headers/footers)
4. **Manual review queue**: Flag suspicious uploads for admin review
5. **Author confirmation**: Allow users to claim authorship with justification

## Testing

To test the verification system:

1. Create a test PDF with author metadata
2. Login with matching name
3. Attempt to upload - should succeed
4. Login with different name
5. Attempt to upload same PDF - should be rejected

## Error Messages

Users will see clear error messages:
- `"Unauthorized. Please login to upload PDFs."` - Not logged in
- `"PDF does not contain author information."` - No metadata
- `"Author verification failed. This PDF appears to be authored by 'X', but you are logged in as 'Y'."` - Name mismatch
