import { NextRequest, NextResponse } from 'next/server'
import { dynamoDB, TABLES } from '@/lib/dynamodb'
import { UpdateCommand } from '@aws-sdk/lib-dynamodb'

export async function PUT(
	request: NextRequest,
	{ params }: { params: { slug: string } }
) {
	try {
		const { slug } = params
		const body = await request.json()
		const { title, content, category, thumbnail_url, images } = body

		const updateExpression = []
		const expressionAttributeValues: any = {}
		const expressionAttributeNames: any = {}

		if (title) {
			updateExpression.push('#title = :title')
			expressionAttributeNames['#title'] = 'title'
			expressionAttributeValues[':title'] = title
		}

		if (content) {
			updateExpression.push('content = :content')
			expressionAttributeValues[':content'] = content
		}

		if (thumbnail_url) {
			updateExpression.push('thumbnail_url = :thumbnail_url')
			expressionAttributeValues[':thumbnail_url'] = thumbnail_url
		}

		// This is the key part - updating images
		if (images !== undefined) {
			updateExpression.push('images = :images')
			expressionAttributeValues[':images'] = images
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
