# Enhanced Registration & Author Verification System

## Overview
The registration process has been enhanced to collect additional information that makes author verification more robust and reliable. This helps prevent false rejections and improves the accuracy of the PDF authorship verification.

## Enhanced Registration Fields

### Required Fields
1. **Full Name** - As it appears on publications
2. **Email Address** - Institutional or personal email
3. **Password** - Secure password for account
4. **Institution/University** - Academic or research institution (REQUIRED)

### Optional Fields
1. **Department/Field** - Research department or field of study
2. **ORCID iD** - Open Researcher and Contributor ID (e.g., 0000-0002-1234-5678)

## User Profile Structure

```typescript
interface User {
  email: string;
  name: string;
  password: string;
  role: 'visitor' | 'author' | 'admin';
  
  // Enhanced fields
  institution?: string;
  department?: string;
  orcid?: string;
  alternativeNames?: string[];
  researcherProfile?: string;
  verificationStatus?: 'unverified' | 'pending' | 'verified';
  verifiedAt?: string;
  
  createdAt: string;
  updatedAt: string;
}
```

## Enhanced Verification Algorithm

The system now performs **11 different verification checks** with confidence scoring:

### High Confidence Matches (90-100%)
1. ✅ **Exact Name Match** - PDF author exactly matches user name
2. ✅ **Email in Author Field** - User's email found in PDF metadata
3. ✅ **ORCID Match** - ORCID ID found in PDF metadata or content
4. ✅ **Full Name Contained** - User name contained in PDF author field
5. ✅ **Alternative Name Match** - Matches saved alternative names

### Medium Confidence Matches (80-89%)
6. ✅ **Co-Author** - Name found in list of multiple authors
7. ✅ **Name with Titles** - Matches after removing Dr., PhD, etc.
8. ✅ **Initials Match** - "J. Smith" matches "John Smith"
9. ✅ **Email and Name in Content** - Both found in PDF body text
10. ✅ **Institution + Last Name** - Institution matches + last name found

### Lower Confidence Matches (75-79%)
11. ✅ **Domain + Partial Name** - Email domain + partial name match

## Benefits of Enhanced Registration

### 1. **More Accurate Verification**
- Reduces false rejections
- Handles name variations (titles, initials)
- Supports co-authored papers

### 2. **Alternative Names Support**
Users can add alternative names they publish under:
- Maiden names
- Abbreviated names
- Cultural name variations
- Pen names

### 3. **ORCID Integration**
- Unique researcher identifier
- 100% confidence when matched
- Works across all publications

### 4. **Institutional Verification**
- Cross-reference institution with PDF affiliation
- Increases confidence in marginal cases
- Helps verify domain emails

### 5. **Content-Based Verification**
- Searches for author email in PDF body
- Checks for name in contact information
- Validates author sections

## Registration Flow

```
User Opens Registration
        ↓
Enters Name (as on publications)
        ↓
Enters Email
        ↓
Enters Institution (REQUIRED)
        ↓
[Optional] Enters Department
        ↓
[Optional] Enters ORCID
        ↓
Creates Password
        ↓
Account Created
        ↓
Verification Status: "unverified"
```

## PDF Upload Verification Flow

```
User Uploads PDF
        ↓
System Extracts Metadata & Content
        ↓
Check 1: PDF has author metadata?
   NO → Reject (400)
   YES → Continue
        ↓
Check 2: Run 11 verification checks
        ↓
Calculate confidence score
        ↓
Verification Result?
   FAIL (0%) → Reject (403)
   PASS (75-100%) → Accept
        ↓
Log match type & confidence
        ↓
Continue Processing
```

## Verification Examples

### Example 1: Exact Match
```
PDF Author: "John Smith"
User Name: "John Smith"
Institution: "MIT"

Result: ✅ VERIFIED (exact_name, 100%)
```

### Example 2: With Titles
```
PDF Author: "Dr. John Smith, PhD"
User Name: "john smith"
Institution: "Stanford University"

Result: ✅ VERIFIED (name_with_titles, 90%)
```

### Example 3: Co-Author
```
PDF Author: "Jane Doe, John Smith, Bob Lee"
User Name: "John Smith"
Institution: "Harvard"

Result: ✅ VERIFIED (co_author, 90%)
```

### Example 4: Initials
```
PDF Author: "J. Smith"
User Name: "John Smith"
Institution: "Oxford University"

Result: ✅ VERIFIED (initials_match, 85%)
```

### Example 5: ORCID Match
```
PDF Content: "...ORCID: 0000-0002-1234-5678..."
User ORCID: "0000-0002-1234-5678"

Result: ✅ VERIFIED (orcid_match, 100%)
```

### Example 6: Institution + Name
```
PDF Author: "Smith, J. (MIT)"
User Name: "John Smith"
User Institution: "Massachusetts Institute of Technology"

Result: ✅ VERIFIED (institution_and_lastname, 80%)
```

## Error Messages

Users receive clear feedback:

### Missing Author Metadata
```
"PDF does not contain author information. Please ensure the PDF 
has proper metadata with author details."
```

### Verification Failed
```
"Author verification failed. This PDF appears to be authored by 
'Jane Doe', but you are logged in as 'John Smith'. Please upload 
only your own journals. If this is your publication, ensure your 
profile name matches the author name in the PDF metadata."
```

## Data Collected vs Privacy

### What We Store
- ✅ Full name (as on publications)
- ✅ Email address
- ✅ Institution/University
- ✅ Department (optional)
- ✅ ORCID (optional)
- ✅ Alternative names (optional)

### What We Don't Store
- ❌ PDF content (deleted after conversion)
- ❌ Verification attempts (only logged)
- ❌ Personal identification documents

## Future Enhancements

1. **ORCID OAuth Integration**
   - Let users login with ORCID
   - Auto-verify publications
   - Import publication list

2. **Email Verification**
   - Verify institutional email addresses
   - Higher trust for .edu domains

3. **Profile Completeness Score**
   - Encourage users to fill optional fields
   - Better verification = higher score

4. **Manual Review Queue**
   - Admin review for edge cases
   - User can request manual verification
   - Appeals process for rejections

5. **AI-Based Verification**
   - Use AI to analyze writing style
   - Compare with user's previous publications
   - Cross-reference with Google Scholar

## Implementation Files

### Modified Files
1. `/src/lib/db/users.ts` - Enhanced User interface
2. `/src/app/api/auth/[...nextauth]/route.ts` - Registration flow
3. `/src/app/components/login/AuthForm.tsx` - Registration form
4. `/src/app/api/pdf/upload/route.ts` - Verification logic

### New Features
- Alternative names support
- ORCID field
- Institution verification
- Content-based verification
- Confidence scoring
- Enhanced logging

## Testing Recommendations

### Test Case 1: Complete Profile
1. Register with all fields filled
2. Upload PDF with matching author
3. Should verify with high confidence

### Test Case 2: Minimal Profile
1. Register with only required fields
2. Upload PDF with exact name match
3. Should still verify successfully

### Test Case 3: ORCID Verification
1. Register with ORCID
2. Upload PDF containing ORCID
3. Should verify with 100% confidence

### Test Case 4: Co-Authored Paper
1. Register as "John Smith"
2. Upload PDF: "Jane Doe, John Smith, Bob Lee"
3. Should verify as co-author

## Security Considerations

✅ **Implemented**
- Password hashing (bcrypt)
- Session-based authentication
- Email uniqueness
- SQL injection prevention (DynamoDB)

⚠️ **Limitations**
- Metadata can be modified
- No email verification yet
- Trust-based system

🔮 **Future**
- Two-factor authentication
- Email verification required
- IP-based rate limiting
- Suspicious activity detection
