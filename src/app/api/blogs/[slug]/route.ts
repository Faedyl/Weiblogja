import { NextRequest, NextResponse } from 'next/server'
import { dynamoDB, TABLES } from '@/lib/dynamodb'
import { UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { DeleteCommand } from '@aws-sdk/lib-dynamodb'

export async function DELETE(
        request: NextRequest,
        { params }: { params: Promise<{ slug: string }> }
) {
        try {
                const { slug } = await params

                const command = new DeleteCommand({
                        TableName: TABLES.BLOGS,
                        Key: {
                                PK: `BLOG#${slug}`,
                                SK: 'METADATA'
                        }
                })

                await dynamoDB.send(command)

                return NextResponse.json({
                        success: true,
                        message: 'Blog deleted successfully'
                })

        } catch (error) {
                console.error('Error deleting blog:', error)
                return NextResponse.json(
                        { error: 'Failed to delete blog post' },
                        { status: 500 }
                )
        }
}
export async function PUT(
        request: NextRequest,
        { params }: { params: Promise<{ slug: string }> }
) {
        try {
                const { slug } = await params
                const body = await request.json()
                const { title, content, category, thumbnail_url, logo_url, images, tags, summary, status, pdf_url } = body

                const updateExpression: string[] = []
                const expressionAttributeValues: Record<string, unknown> = {}
                const expressionAttributeNames: Record<string, string> = {}

                if (title) {
                        updateExpression.push('#title = :title')
                        expressionAttributeNames['#title'] = 'title'
                        expressionAttributeValues[':title'] = title
                }

                if (content) {
                        updateExpression.push('content = :content')
                        expressionAttributeValues[':content'] = content
                }

                if (category !== undefined) {
                        updateExpression.push('category = :category')
                        expressionAttributeValues[':category'] = category
                }

                if (thumbnail_url) {
                        updateExpression.push('thumbnail_url = :thumbnail_url')
                        expressionAttributeValues[':thumbnail_url'] = thumbnail_url
                }

                if (logo_url) {
                        updateExpression.push('logo_url = :logo_url')
                        expressionAttributeValues[':logo_url'] = logo_url
                }

                if (images !== undefined) {
                        updateExpression.push('images = :images')
                        expressionAttributeValues[':images'] = images
                }

                if (tags !== undefined) {
                        updateExpression.push('tags = :tags')
                        expressionAttributeValues[':tags'] = tags
                }

                if (summary !== undefined) {
                        updateExpression.push('summary = :summary')
                        expressionAttributeValues[':summary'] = summary
                }

                if (status !== undefined) {
                        updateExpression.push('#status = :status')
                        expressionAttributeNames['#status'] = 'status'
                        expressionAttributeValues[':status'] = status
                }

                if (pdf_url !== undefined) {
                        updateExpression.push('pdf_url = :pdf_url')
                        expressionAttributeValues[':pdf_url'] = pdf_url
                }

                updateExpression.push('updated_at = :updated_at')
                expressionAttributeValues[':updated_at'] = new Date().toISOString()

                const command = new UpdateCommand({
                        TableName: TABLES.BLOGS,
                        Key: {
                                PK: `BLOG#${slug}`,
                                SK: 'METADATA'
                        },
                        UpdateExpression: `SET ${updateExpression.join(', ')}`,
                        ExpressionAttributeValues: expressionAttributeValues,
                        ...(Object.keys(expressionAttributeNames).length > 0 && {
                                ExpressionAttributeNames: expressionAttributeNames
                        }),
                        ReturnValues: 'ALL_NEW'
                })

                const result = await dynamoDB.send(command)

                return NextResponse.json({
                        success: true,
                        blog: result.Attributes
                })

        } catch (error) {
                console.error('Error updating blog:', error)
                return NextResponse.json(
                        { error: 'Failed to update blog post' },
                        { status: 500 }
                )
        }
}
