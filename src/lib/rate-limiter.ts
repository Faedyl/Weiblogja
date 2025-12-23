import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({
	region: process.env.AWS_REGION || "us-east-1",
	credentials: {
		accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
	},
});

const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.DYNAMODB_USERS_TABLE || "weiblogja-users";

export interface RateLimitConfig {
	visitor: number;
	author: number;
	admin: number;
	windowMs: number;
}

export interface RateLimitResult {
	allowed: boolean;
	remaining: number;
	resetTime: Date;
	limit: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
	visitor: parseInt(process.env.RATE_LIMIT_VISITOR || "10"),
	author: parseInt(process.env.RATE_LIMIT_AUTHOR || "50"),
	admin: parseInt(process.env.RATE_LIMIT_ADMIN || "200"),
	windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "60000"), // 1 minute default
};

export class RateLimiter {
	private config: RateLimitConfig;

	constructor(config?: Partial<RateLimitConfig>) {
		this.config = { ...DEFAULT_CONFIG, ...config };
	}

	private getLimitForRole(role: 'visitor' | 'author' | 'admin' = 'visitor'): number {
		return this.config[role];
	}

	async checkLimit(
		identifier: string,
		role: 'visitor' | 'author' | 'admin' = 'visitor',
		endpoint?: string
	): Promise<RateLimitResult> {
		const limit = this.getLimitForRole(role);
		const now = Date.now();
		const windowStart = now - this.config.windowMs;
		const resetTime = new Date(now + this.config.windowMs);

		const key = endpoint ? `${identifier}:${endpoint}` : identifier;

		try {
			const getCommand = new GetCommand({
				TableName: TABLE_NAME,
				Key: {
					PK: `RATELIMIT#${key}`,
					SK: "COUNTER",
				},
			});

			const result = await docClient.send(getCommand);
			
			let currentCount = 0;
			let lastReset = now;

			if (result.Item) {
				const itemTimestamp = result.Item.timestamp || 0;
				
				if (itemTimestamp > windowStart) {
					currentCount = result.Item.count || 0;
					lastReset = itemTimestamp;
				}
			}

			if (currentCount >= limit) {
				return {
					allowed: false,
					remaining: 0,
					resetTime: new Date(lastReset + this.config.windowMs),
					limit,
				};
			}

			const newCount = currentCount + 1;

			const putCommand = new PutCommand({
				TableName: TABLE_NAME,
				Item: {
					PK: `RATELIMIT#${key}`,
					SK: "COUNTER",
					count: newCount,
					timestamp: currentCount === 0 ? now : lastReset,
					role,
					endpoint,
					expiresAt: Math.floor((now + this.config.windowMs * 2) / 1000),
				},
			});

			await docClient.send(putCommand);

			return {
				allowed: true,
				remaining: limit - newCount,
				resetTime: new Date((currentCount === 0 ? now : lastReset) + this.config.windowMs),
				limit,
			};
		} catch (error) {
			console.error("Rate limit check error:", error);
			return {
				allowed: true,
				remaining: limit,
				resetTime,
				limit,
			};
		}
	}

	async reset(identifier: string, endpoint?: string): Promise<void> {
		const key = endpoint ? `${identifier}:${endpoint}` : identifier;
		
		try {
			const putCommand = new PutCommand({
				TableName: TABLE_NAME,
				Item: {
					PK: `RATELIMIT#${key}`,
					SK: "COUNTER",
					count: 0,
					timestamp: Date.now(),
				},
			});

			await docClient.send(putCommand);
		} catch (error) {
			console.error("Rate limit reset error:", error);
		}
	}
}

export const rateLimiter = new RateLimiter();
