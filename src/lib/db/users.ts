import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import bcrypt from "bcryptjs";

const client = new DynamoDBClient({
	region: process.env.AWS_REGION || "us-east-1",
	credentials: {
		accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
		secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
	},
});

const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.DYNAMODB_USERS_TABLE || "weiblogja-users";

export interface User {
	email: string;
	name: string;
	password: string;
	createdAt: string;
	updatedAt: string;
}

export async function createUser(email: string, name: string, password: string): Promise<User> {
	const hashedPassword = await bcrypt.hash(password, 10);

	const user: User = {
		email,
		name,
		password: hashedPassword,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
	};

	await docClient.send(
		new PutCommand({
			TableName: TABLE_NAME,
			Item: user,
			ConditionExpression: "attribute_not_exists(email)", // Prevent duplicate emails
		})
	);

	return user;
}

export async function getUserByEmail(email: string): Promise<User | null> {
	const result = await docClient.send(
		new GetCommand({
			TableName: TABLE_NAME,
			Key: { email },
		})
	);

	return result.Item as User | null;
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
	return bcrypt.compare(password, hashedPassword);
}

export async function getAllUsers(): Promise<User[]> {
	const result = await docClient.send(
		new ScanCommand({
			TableName: TABLE_NAME,
		})
	);

	return (result.Items as User[]) || [];
}
