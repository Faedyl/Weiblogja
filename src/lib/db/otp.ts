import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({
	region: process.env.AWS_REGION || "us-east-1",
	credentials: {
		accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
	},
});

const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.DYNAMODB_USERS_TABLE || "weiblogja-users";

export interface OTPRecord {
	email: string;
	otp: string;
	expiresAt: string;
	attempts: number;
	createdAt: string;
}

export async function storeOTP(email: string, otp: string): Promise<void> {
	const now = new Date();
	const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes

	const command = new PutCommand({
		TableName: TABLE_NAME,
		Item: {
			PK: `USER#${email}`,
			SK: "OTP",
			email,
			otp,
			expiresAt: expiresAt.toISOString(),
			attempts: 0,
			createdAt: now.toISOString(),
			ttl: Math.floor(expiresAt.getTime() / 1000), // DynamoDB TTL
		},
	});

	await docClient.send(command);
}

export async function verifyOTP(email: string, otp: string): Promise<{ valid: boolean; message: string }> {
	const getCommand = new GetCommand({
		TableName: TABLE_NAME,
		Key: {
			PK: `USER#${email}`,
			SK: "OTP",
		},
	});

	const result = await docClient.send(getCommand);
	
	if (!result.Item) {
		return { valid: false, message: "No OTP found. Please request a new one." };
	}

	const record = result.Item as OTPRecord;

	// Check expiration
	if (new Date() > new Date(record.expiresAt)) {
		await deleteOTP(email);
		return { valid: false, message: "OTP has expired. Please request a new one." };
	}

	// Check attempts (max 5 attempts)
	if (record.attempts >= 5) {
		await deleteOTP(email);
		return { valid: false, message: "Too many failed attempts. Please request a new OTP." };
	}

	// Verify OTP
	if (record.otp !== otp) {
		// Increment attempts
		const updateCommand = new PutCommand({
			TableName: TABLE_NAME,
			Item: {
				...result.Item,
				attempts: record.attempts + 1,
			},
		});
		await docClient.send(updateCommand);
		return { valid: false, message: `Invalid OTP. ${4 - record.attempts} attempts remaining.` };
	}

	// Valid OTP - delete it
	await deleteOTP(email);
	return { valid: true, message: "OTP verified successfully!" };
}

export async function deleteOTP(email: string): Promise<void> {
	const command = new DeleteCommand({
		TableName: TABLE_NAME,
		Key: {
			PK: `USER#${email}`,
			SK: "OTP",
		},
	});

	await docClient.send(command);
}
