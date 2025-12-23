import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/[...nextauth]/route';
import { rateLimiter } from './rate-limiter';

export interface RateLimitMiddlewareOptions {
	endpoint?: string;
	skipRoles?: ('visitor' | 'author' | 'admin')[];
}

export async function withRateLimit(
	request: NextRequest,
	handler: (req: NextRequest) => Promise<NextResponse>,
	options?: RateLimitMiddlewareOptions
): Promise<NextResponse> {
	try {
		const session = await auth();
		const role = (session?.user as any)?.role || 'visitor';
		
		if (options?.skipRoles?.includes(role)) {
			return handler(request);
		}

		const identifier = session?.user?.email || request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'anonymous';
		const endpoint = options?.endpoint || request.nextUrl.pathname;

		const result = await rateLimiter.checkLimit(identifier, role, endpoint);

		if (!result.allowed) {
			return NextResponse.json(
				{
					error: 'Rate limit exceeded',
					message: `Too many requests. Please try again after ${result.resetTime.toISOString()}`,
					resetTime: result.resetTime.toISOString(),
					limit: result.limit,
				},
				{
					status: 429,
					headers: {
						'X-RateLimit-Limit': result.limit.toString(),
						'X-RateLimit-Remaining': result.remaining.toString(),
						'X-RateLimit-Reset': result.resetTime.toISOString(),
						'Retry-After': Math.ceil((result.resetTime.getTime() - Date.now()) / 1000).toString(),
					},
				}
			);
		}

		const response = await handler(request);

		response.headers.set('X-RateLimit-Limit', result.limit.toString());
		response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
		response.headers.set('X-RateLimit-Reset', result.resetTime.toISOString());

		return response;
	} catch (error) {
		console.error('Rate limit middleware error:', error);
		return handler(request);
	}
}
