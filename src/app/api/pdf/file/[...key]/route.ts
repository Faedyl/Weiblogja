import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { logger } from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  try {
    const { key } = await params;
    
    // Join the key array back into a path (since it's a catch-all route)
    const keyPath = Array.isArray(key) ? key.join('/') : key;
    
    // Validate that the key starts with 'pdfs/' to prevent directory traversal
    if (!keyPath.startsWith('pdfs/')) {
      return NextResponse.json(
        { error: 'Invalid file path' },
        { status: 400 }
      );
    }

    const s3Client = new S3Client({
      region: process.env.AWS_REGION!,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    const bucketName = process.env.S3_BUCKET_NAME || process.env.AWS_S3_BUCKET_NAME || 'weiblogja-image';

    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: keyPath,
    });

    const response = await s3Client.send(command);
    
    if (!response.Body) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Convert the response body to a Buffer
    const body = response.Body as any;
    const arrayBuffer = await body.transformToByteArray();
    
    // Return the PDF file with appropriate headers
    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': response.ContentType || 'application/pdf',
        'Content-Disposition': `inline; filename="${keyPath.split('/').pop()}"`,
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
    
  } catch (error: any) {
    logger.error('Error serving PDF file:', error);
    
    if (error.name === 'NoSuchKey') {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to serve PDF file' },
      { status: 500 }
    );
  }
}