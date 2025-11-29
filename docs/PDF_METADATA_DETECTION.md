# PDF Metadata Detection & Author Extraction

## Overview
The system now has **enhanced metadata detection** that can extract author information from PDFs even when the metadata fields are empty or missing.

## Problem Solved
**Before:** PDFs without proper metadata (Author field) were automatically rejected.  
**Now:** System tries multiple extraction methods before rejecting.

## Detection Methods (In Order)

### Method 1: PDF Metadata (Standard)
Checks the PDF's metadata properties for the Author field.

```
File → Properties → Author field
```

**When it works:**
- ✅ PDF created with proper document properties
- ✅ Published papers from journals
- ✅ Documents from Microsoft Word, LaTeX with metadata

**When it fails:**
- ❌ Scanned documents
- ❌ PDFs from web conversions
- ❌ Manually edited PDFs without metadata update

### Method 2: Content Pattern Extraction (NEW)
Searches the PDF text content for author information using 5 different patterns.

#### Pattern 1: Author Indicators
Looks for explicit author labels in the first 50 lines:
```
Authors: John Smith, Jane Doe
By: John Smith
Written by: John Smith
```

#### Pattern 2: Email Pattern
Finds names adjacent to email addresses:
```
John Smith (john@university.edu)
John Smith <john.smith@mit.edu>
```

#### Pattern 3: Affiliation Pattern
Detects author names followed by institutional affiliations:
```
John Smith¹
Massachusetts Institute of Technology

Jane Doe²
Stanford University
```

#### Pattern 4: Corresponding Author
Searches for corresponding author sections:
```
Corresponding author: John Smith
Contact: John Smith, john@mit.edu
```

#### Pattern 5: Citation Format
Extracts from citation-style author lists:
```
Smith, J., & Doe, J. (2024)
Smith, J., Doe, J., & Lee, R. (2023)
```

### Method 3: Content Search Fallback (Last Resort)
If no author is found through patterns, searches entire PDF for:
- User's full name
- User's email address

If found, proceeds with content-based verification.

## Verification Flow

```
┌─────────────────────────────────────┐
│   Upload PDF                        │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│   Extract PDF Metadata              │
│   Check: data.info.Author           │
└────────────┬────────────────────────┘
             │
        ┌────┴────┐
        │  Found? │
        └────┬────┘
             │
     ┌───────┴────────┐
     │                │
    YES              NO
     │                │
     │                ▼
     │    ┌──────────────────────────┐
     │    │  Try Content Extraction  │
     │    │  (5 patterns)            │
     │    └──────────┬───────────────┘
     │               │
     │          ┌────┴────┐
     │          │  Found? │
     │          └────┬────┘
     │               │
     │       ┌───────┴────────┐
     │       │                │
     │      YES              NO
     │       │                │
     │       │                ▼
     │       │    ┌───────────────────────┐
     │       │    │  Search Content for   │
     │       │    │  User Name/Email      │
     │       │    └──────────┬────────────┘
     │       │               │
     │       │          ┌────┴────┐
     │       │          │  Found? │
     │       │          └────┬────┘
     │       │               │
     │       │       ┌───────┴────────┐
     │       │       │                │
     │       │      YES              NO
     │       │       │                │
     ▼       ▼       ▼                ▼
┌────────────────────────────────────────┐
│    Proceed to Author Verification     │
│    (11 verification checks)            │
└────────────────────────────────────────┘
                                          │
                                    ┌─────┴─────┐
                                    │   REJECT  │
                                    │   (400)   │
                                    └───────────┘
```

## Enhanced Error Messages

### Old Error (Before)
```
"PDF does not contain author information."
```

### New Error (After)
```
"PDF does not contain clear author information. We checked:
1. PDF metadata (Author field) - not found
2. PDF content patterns - not found
3. Your name/email in content - not found

Please ensure the PDF:
- Has author metadata (check File → Properties)
- Contains your name in the author section
- Is not a scanned document without text layer"
```

## Logging Improvements

The system now logs detailed information about metadata extraction:

```typescript
logger.debug(`Author extracted from content: "John Smith"`);
logger.debug(`PDF Metadata - Title: "Research Paper", Author: "John Smith"`);
logger.debug(`✓ Author verified: John Smith matches John Smith (exact_name, confidence: 100%)`);
```

## Examples

### Example 1: Metadata Present
```
PDF Properties:
  Title: "Machine Learning Research"
  Author: "John Smith"

Result: ✅ Author found in metadata
```

### Example 2: No Metadata, Pattern Match
```
PDF Content (first page):
  "Machine Learning Research
   
   John Smith
   Massachusetts Institute of Technology
   john@mit.edu"

Result: ✅ Author extracted from content (Pattern 3: Affiliation)
```

### Example 3: No Metadata, Email Pattern
```
PDF Content:
  "For correspondence: John Smith (john.smith@university.edu)"

Result: ✅ Author extracted from content (Pattern 2: Email)
```

### Example 4: Fallback to Content Search
```
PDF: No metadata, no clear patterns
PDF Content: Contains "John Smith" and "john@mit.edu" somewhere in text
User Profile: Name: "John Smith", Email: "john@mit.edu"

Result: ✅ Fallback content search found match
```

### Example 5: Complete Failure
```
PDF: Scanned document with no text layer
OR: PDF with no mention of user

Result: ❌ Rejected with detailed explanation
```

## For Users: How to Check Your PDF

### Windows
1. Right-click PDF file
2. Properties → Details
3. Check "Authors" field

### Mac
1. Select PDF file
2. Cmd + I (Get Info)
3. Check "Author" field

### Linux
1. Right-click PDF file
2. Properties → PDF/Details
3. Check "Author" field

### Adobe Acrobat
1. File → Properties
2. Description tab
3. Check "Author" field

## For Users: How to Fix Missing Metadata

### Using Adobe Acrobat
1. Open PDF
2. File → Properties
3. Description tab
4. Fill in "Author" field with your full name
5. Save

### Using Free Tools

**Windows:**
- PDF-XChange Editor
- PDFtk (command line)

**Mac:**
- Preview (built-in)
- PDFtk (Homebrew)

**Linux:**
- PDFMod
- PDFtk
- Calibre

### Command Line (PDFtk)
```bash
# Create metadata file
echo "InfoKey: Author" > metadata.txt
echo "InfoValue: John Smith" >> metadata.txt

# Update PDF
pdftk input.pdf update_info metadata.txt output output.pdf
```

## Technical Details

### Code Location
- **Extraction:** `/src/services/pdf-extractor.ts`
- **Methods:** `extractAuthorFromContent()`, `extractTitleFromContent()`
- **Verification:** `/src/app/api/pdf/upload/route.ts`

### Patterns Used (Regex)

```typescript
// Pattern 1: Author indicators
/^authors?:?\s*(.+)/i
/^by:?\s*(.+)/i
/^written\s+by:?\s*(.+)/i

// Pattern 2: Email pattern
/([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+)\s*(?:\([^@]+@[^)]+\)|[^@]+@\S+)/

// Pattern 3: Affiliation pattern
/^([A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][a-z]+)[\s,]*\d*\s*$/

// Pattern 4: Corresponding author
/corresponding\s+author:?\s*([^,\n]+)/i

// Pattern 5: Citation format
/([A-Z][a-z]+,\s+[A-Z]\.(?:,?\s+(?:&|and)\s+[A-Z][a-z]+,\s+[A-Z]\.)?)\s*\(\d{4}\)/
```

## Benefits

### 1. Fewer False Rejections
- PDFs without metadata can now be processed
- Reduces user frustration

### 2. Better User Experience
- Clear error messages with actionable steps
- Multiple extraction attempts

### 3. Wider PDF Support
- Works with scanned documents (if OCR applied)
- Handles various PDF generators
- Supports different formatting styles

### 4. Transparency
- Logs show exactly what was found
- Users understand why verification failed

## Limitations

### Still Cannot Handle:
- ❌ Pure image PDFs (no text layer)
- ❌ PDFs with completely different author
- ❌ PDFs where author name is in images only
- ❌ Heavily encrypted PDFs
- ❌ Corrupted PDF files

### Recommendations:
1. Always add proper metadata to your PDFs
2. Ensure PDFs have searchable text (not just images)
3. Use academic PDF templates that include metadata
4. Keep your profile name matching your publication name

## Future Enhancements

### Planned:
- 🔜 OCR integration for scanned documents
- 🔜 Image text extraction (for author names in images)
- 🔜 DOI lookup to verify author from CrossRef API
- 🔜 Machine learning for author detection
- 🔜 Support for non-Latin characters

### Under Consideration:
- Multiple language support
- Custom author extraction rules per user
- Manual override with justification
- Admin review queue for edge cases

## Testing

### Test Case 1: Standard PDF
- Create PDF with metadata
- Upload → Should extract from metadata

### Test Case 2: No Metadata
- Remove PDF metadata
- Add author name in content
- Upload → Should extract from content

### Test Case 3: Email Pattern
- PDF with "Contact: John Smith (email@edu)"
- Upload → Should extract from email pattern

### Test Case 4: Fallback
- PDF with user name somewhere in text
- Upload → Should use fallback search

### Test Case 5: Complete Failure
- PDF with no author information
- Upload → Should reject with helpful message
