# Configuration Guide

## Environment Variables

### Required Variables

#### AWS Configuration

```bash
# AWS region where your resources are located
AWS_REGION=ap-southeast-1

# AWS credentials for programmatic access
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key

# S3 bucket name for image storage
S3_BUCKET_NAME=weiblogja-image

# DynamoDB table name for data storage
DYNAMODB_TEST_TABLE=weiblogja-dev
```

#### Google Gemini API

```bash
# API key from Google AI Studio
GOOGLE_GEMINI_API_KEY=your-gemini-api-key
```

Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

#### NextAuth Configuration

```bash
# Application URL
NEXTAUTH_URL=http://localhost:3000

# Secret key for session encryption (generate with: openssl rand -base64 32)
NEXTAUTH_SECRET=your-generated-secret
```

### Optional Variables

```bash
# Enable verbose logging for debugging
VERBOSE=true

# Alternative S3 bucket name environment variable
AWS_S3_BUCKET_NAME=weiblogja-image
```

## Logging Configuration

### Verbose Mode

Control debug logging output with the `VERBOSE` environment variable:

**Enable verbose logging:**
```bash
VERBOSE=true
```

**Disable verbose logging (default):**
```bash
VERBOSE=false
```

### Log Levels

- `debug` - Detailed debugging information (hidden by default)
- `info` - General informational messages (hidden by default)
- `warn` - Warning messages (always shown)
- `error` - Error messages (always shown)

### Usage in Code

```typescript
import { logger } from '@/lib/logger';

logger.debug('Debug message');  // Only shown when VERBOSE=true
logger.info('Info message');     // Only shown when VERBOSE=true
logger.warn('Warning message');  // Always shown
logger.error('Error message');   // Always shown
```

## AWS IAM Policy

Create an IAM user with the following minimum permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject"
            ],
            "Resource": "arn:aws:s3:::your-bucket-name/*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "dynamodb:PutItem",
                "dynamodb:GetItem",
                "dynamodb:UpdateItem",
                "dynamodb:Query",
                "dynamodb:Scan"
            ],
            "Resource": [
                "arn:aws:dynamodb:region:account-id:table/your-table-name",
                "arn:aws:dynamodb:region:account-id:table/your-table-name/index/*"
            ]
        }
    ]
}
```

## DynamoDB Schema

### Table Structure

The application uses a single-table design with the following key structure:

**Primary Key:**
- Partition Key: `PK` (String)
- Sort Key: `SK` (String)

**Global Secondary Index (GSI1):**
- Partition Key: `GSI1PK` (String)
- Sort Key: `GSI1SK` (String)

### Entity Patterns

#### User Entity
```
PK: USER#<email>
SK: PROFILE
```

#### Blog Post Entity
```
PK: BLOG#<slug>
SK: METADATA
GSI1PK: AUTHOR#<author_id>
GSI1SK: <created_at>
```

## S3 Storage Structure

Images are organized in the following structure:

```
weiblogja/
├── blogs/
│   ├── thumbnails/
│   │   └── author_<author_id>/
│   │       └── <blog_slug>/
│   │           └── <timestamp>_<filename>
│   └── content/
│       └── author_<author_id>/
│           └── <blog_slug>/
│               └── <timestamp>_<filename>
└── blog-images/
    └── <uuid>.<extension>
```

## Security Best Practices

1. Never commit `.env.local` to version control
2. Use environment-specific credentials
3. Rotate AWS access keys regularly
4. Use least-privilege IAM policies
5. Enable S3 bucket encryption
6. Use strong NEXTAUTH_SECRET values
7. Restrict S3 bucket public access to necessary paths only

## Production Configuration

For production deployment:

1. Set `NEXTAUTH_URL` to your production domain
2. Use production AWS credentials with restricted permissions
3. Set `VERBOSE=false` to disable debug logging
4. Enable CloudFront for S3 assets (recommended)
5. Use DynamoDB on-demand billing or provisioned capacity as needed
6. Configure proper CORS policies for production domains
