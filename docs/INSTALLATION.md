# Installation Guide

## Prerequisites

- Node.js 18+ and npm
- AWS Account with S3 and DynamoDB access
- Google Gemini API key

## Installation Steps

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Weiblogja
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env.local` file in the root directory:

```bash
# AWS Configuration
AWS_REGION=your-aws-region
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
S3_BUCKET_NAME=your-s3-bucket-name
DYNAMODB_TEST_TABLE=your-dynamodb-table-name

# Google Gemini API
GOOGLE_GEMINI_API_KEY=your-gemini-api-key

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret

# Optional: Enable verbose logging
VERBOSE=false
```

### 4. AWS Setup

#### DynamoDB Table

Create a DynamoDB table with the following configuration:

- **Table name**: As specified in `DYNAMODB_TEST_TABLE`
- **Partition key**: `PK` (String)
- **Sort key**: `SK` (String)
- **Global Secondary Index**: 
  - Index name: `GSI1`
  - Partition key: `GSI1PK` (String)
  - Sort key: `GSI1SK` (String)

#### S3 Bucket

Create an S3 bucket with:

- **Bucket name**: As specified in `S3_BUCKET_NAME`
- **Region**: Same as `AWS_REGION`
- **Public access**: Configure CORS and public read access for uploaded images
- **CORS configuration**:

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST"],
        "AllowedOrigins": ["*"],
        "ExposeHeaders": []
    }
]
```

### 5. Run Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### 6. Build for Production

```bash
npm run build
npm start
```

## Troubleshooting

### Build Errors

If you encounter build errors, ensure all environment variables are properly set in `.env.local`

### AWS Connection Issues

Verify your AWS credentials have the necessary permissions:
- S3: `PutObject`, `GetObject`
- DynamoDB: `PutItem`, `GetItem`, `Scan`, `Query`

### Port Already in Use

If port 3000 is already in use, specify a different port:

```bash
PORT=3001 npm run dev
```
