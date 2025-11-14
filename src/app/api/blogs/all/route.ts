import { NextResponse } from 'next/server'
import { dynamoDB, TABLES, BlogPost } from '@/lib/dynamodb'
import { ScanCommand } from '@aws-sdk/lib-dynamodb'

export async function GET() {
        try {
                const command = new ScanCommand({
                        TableName: TABLES.BLOGS,
                        FilterExpression: "begins_with(PK, :blogPrefix) AND SK = :sk AND #status = :status",
                        ExpressionAttributeValues: {
                                ":blogPrefix": "BLOG#",
                                ":sk": "METADATA",
                                ":status": "published"
                        },
                        ExpressionAttributeNames: {
                                "#status": "status"
                        }
                })

                const result = await dynamoDB.send(command)
                const blogs = (result.Items || []) as BlogPost[]

                const sortedBlogs = blogs
                        .sort((a, b) => {
                                const dateA = new Date(a.created_at).getTime()
                                const dateB = new Date(b.created_at).getTime()
                                return dateB - dateA
                        })
                        .map(blog => ({
                                ...blog,
                                slug: blog.PK.replace('BLOG#', '')
                        }))

                return NextResponse.json({
                        success: true,
                        blogs: sortedBlogs,
                        total: sortedBlogs.length
                })

        } catch (error) {
                console.error('Error fetching all blogs:', error)
                return NextResponse.json(
                        { error: 'Failed to fetch blogs' },
                        { status: 500 }
                )
        }
}
