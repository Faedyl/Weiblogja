import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

export async function GET(
        request: NextRequest,
        { params }: { params: { id: string } }
) {
        try {
                const { id } = params;


                const filePath = path.join(process.cwd(), 'uploads', 'pdfs', `${id}.pdf`);

                try {
                        await readFile(filePath);
                        return NextResponse.json({
                                id,
                                status: 'completed',
                                message: 'Conversion completed successfully',
                        });
                } catch {
                        return NextResponse.json({
                                id,
                                status: 'not_found',
                                message: 'Conversion not found',
                        }, { status: 404 });
                }
        } catch (error: any) {
                return NextResponse.json(
                        { error: error.message },
                        { status: 500 }
                );
        }
}
