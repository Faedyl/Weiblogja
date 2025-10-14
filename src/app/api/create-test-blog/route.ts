import { NextRequest, NextResponse } from 'next/server'
import { createTestBlogWithImages } from '@/lib/dynamodb'

export async function POST(request: NextRequest) {
	try {
		console.log('🚀 Creating test blog with images...')

		const result = await createTestBlogWithImages()

		if (result.success) {
			console.log('✅ Test blog created successfully!')
			return NextResponse.json({
				success: true,
				message: 'Test blog with images created successfully!',
				blog: result.blog
			})
		} else {
			console.error('❌ Failed to create test blog:', result.error)
			return NextResponse.json({
				success: false,
				error: result.error
			}, { status: 500 })
		}

	} catch (error) {
		console.error('❌ API Error:', error)
		return NextResponse.json({
			success: false,
			error: error.message
		}, { status: 500 })
	}
}
