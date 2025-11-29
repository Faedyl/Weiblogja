# User Profile Update Guide

## For Existing Users

If you registered before the enhanced verification system was implemented, you may need to update your profile to ensure smooth PDF verification.

## Why Update Your Profile?

The enhanced verification system uses additional information to:
- ✅ Reduce false rejections when uploading PDFs
- ✅ Handle name variations (titles, initials, etc.)
- ✅ Support co-authored publications
- ✅ Verify using ORCID and institutional affiliation

## Required Updates

### 1. Add Your Institution
**Why it's needed:** Helps verify PDFs with institutional affiliations

**How to add:**
1. Go to Profile → Edit Profile
2. Enter your Institution/University
3. Save changes

**Example:** "Massachusetts Institute of Technology" or "MIT"

### 2. Review Your Display Name
**Why it's needed:** Must match how you appear in PDF author metadata

**Check if your name matches:**
- Exactly as it appears on publications
- Including middle initials if you use them
- Without unnecessary titles (we handle those automatically)

**Good examples:**
- ✅ "John Smith"
- ✅ "John A. Smith"
- ✅ "Mary Johnson-Williams"

**Avoid:**
- ❌ "Dr. John Smith" (titles removed automatically)
- ❌ "john" (incomplete name)
- ❌ "J.S." (use full name, initials verified separately)

## Optional but Recommended

### 3. Add Alternative Names
**When to use:** If you publish under different names

**Examples:**
- Maiden name: "Jane Doe" → Add "Jane Smith" as alternative
- Cultural variations: "李明" → Add "Li Ming" as alternative
- Abbreviated forms: "Elizabeth Johnson" → Add "Liz Johnson"

**How to add:**
1. Go to Profile → Edit Profile
2. Look for "Alternative Names" section
3. Add each variation
4. Save changes

### 4. Add Your ORCID
**Why it's helpful:** Provides 100% confidence verification

**What is ORCID?**
- Unique identifier for researchers
- Format: 0000-0002-1234-5678
- Get one free at https://orcid.org

**Benefits:**
- Instant verification if PDF contains your ORCID
- Works across all your publications
- No name matching needed

**How to add:**
1. Get your ORCID from https://orcid.org
2. Go to Profile → Edit Profile
3. Enter ORCID (e.g., 0000-0002-1234-5678)
4. Save changes

### 5. Add Department/Field
**Why it's helpful:** Additional verification context

**Examples:**
- "Computer Science"
- "Department of Biology"
- "School of Medicine"

## Profile Completeness Checklist

### Minimum Required ✅
- [x] Full name (as on publications)
- [x] Email address
- [x] Institution/University
- [x] Password

### Recommended for Better Verification ⭐
- [ ] Department/Field
- [ ] ORCID iD
- [ ] Alternative names (if applicable)

### Coming Soon 🔮
- [ ] Google Scholar profile link
- [ ] ResearchGate profile link
- [ ] Email verification badge

## Troubleshooting PDF Rejections

### Issue 1: "Author verification failed"

**Possible causes:**
1. Your profile name doesn't match PDF author
2. PDF has no author metadata
3. You're uploading someone else's paper

**Solutions:**
- ✅ Update your profile name to match publications
- ✅ Add alternative names if you publish under different names
- ✅ Add your ORCID if it's in the PDF
- ✅ Check PDF properties to see author name
- ✅ Ensure PDF has proper metadata

### Issue 2: "PDF does not contain author information"

**Cause:** PDF file has no author metadata

**Solutions:**
- ✅ Edit PDF properties to add author metadata
- ✅ Use a PDF editor to add metadata
- ✅ Re-export PDF with proper metadata
- ✅ Check if you're uploading a scanned document (lacks metadata)

### Issue 3: Co-authored paper rejected

**Cause:** Your name not found in author list

**Solutions:**
- ✅ Ensure PDF author field includes all authors
- ✅ Check if your name appears as: "Smith, J." vs "John Smith"
- ✅ Add alternative name variations to profile
- ✅ Check PDF content for your email address

## How to Check PDF Metadata

### On Windows
1. Right-click PDF file
2. Select "Properties"
3. Go to "Details" tab
4. Look for "Authors" field

### On Mac
1. Select PDF file
2. Press `Cmd + I` (Get Info)
3. Look for "Author" field

### On Linux
1. Right-click PDF file
2. Select "Properties"
3. Go to "PDF" or "Details" tab
4. Look for "Author" field

### Using Adobe Acrobat
1. Open PDF in Acrobat
2. File → Properties
3. Go to "Description" tab
4. Check "Author" field

## How to Edit PDF Metadata

### Using Adobe Acrobat
1. Open PDF in Acrobat
2. File → Properties
3. Go to "Description" tab
4. Edit "Author" field
5. Add your full name
6. Click "OK" and save

### Using Free Tools
- **PDFtk** (command line)
- **PDF-XChange Editor** (Windows)
- **Preview** (Mac)
- **PDFMod** (Linux)

## Verification Confidence Levels

Understanding what makes a strong match:

### 🟢 High Confidence (90-100%)
- Exact name match
- ORCID match
- Email in author field
- Full name contained in authors

### 🟡 Medium Confidence (80-89%)
- Name with titles removed
- Initials match
- Co-author in list
- Email + name in content

### 🟠 Lower Confidence (75-79%)
- Domain + partial name match
- Institution + last name

**Note:** System accepts matches with 75% confidence or higher

## API for Profile Updates

### Update Profile Endpoint
```typescript
PUT /api/users/profile

Headers:
  Authorization: Bearer <token>

Body:
{
  "institution": "MIT",
  "department": "Computer Science",
  "orcid": "0000-0002-1234-5678",
  "alternativeNames": ["J. Smith", "John A. Smith"]
}
```

### Get Profile Endpoint
```typescript
GET /api/users/profile

Headers:
  Authorization: Bearer <token>

Response:
{
  "email": "john@mit.edu",
  "name": "John Smith",
  "institution": "MIT",
  "department": "Computer Science",
  "orcid": "0000-0002-1234-5678",
  "alternativeNames": ["J. Smith"],
  "verificationStatus": "unverified"
}
```

## Privacy & Data Usage

### What We Use
Your profile information is used ONLY for:
- ✅ Verifying PDF authorship
- ✅ Displaying your author profile
- ✅ Improving verification accuracy

### What We Don't Do
- ❌ Share your data with third parties
- ❌ Use data for marketing
- ❌ Store PDF content permanently
- ❌ Expose your email publicly

## Support

### Need Help?
- 📧 Email: support@weiblogja.com
- 💬 Discord: discord.gg/weiblogja
- 📖 Documentation: /docs/

### Report Issues
- 🐛 GitHub Issues: github.com/weiblogja/issues
- 📝 Feature Requests: github.com/weiblogja/discussions

## Changelog

### Version 2.0 (Current)
- ✅ Enhanced registration with institution field
- ✅ ORCID support
- ✅ Alternative names
- ✅ 11 verification checks
- ✅ Confidence scoring

### Version 1.0 (Legacy)
- Basic name matching only
- No institutional verification
- Limited to exact matches
