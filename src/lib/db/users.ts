import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
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
        role: 'visitor' | 'author' | 'admin'
        avatar?: string;
        bio?: string;
}

export async function createUser(email: string, name: string, password: string): Promise<User> {
        const hashedPassword = await bcrypt.hash(password, 12);
        const now = new Date().toISOString();

        const user: User = {
                email,
                name,
                password: hashedPassword,
                createdAt: now,
                updatedAt: now,
                role: "user",
        };

        const command = new PutCommand({
                TableName: TABLE_NAME,
                Item: {
                        PK: `USER#${email}`,
                        SK: `PROFILE#${email}`,
                        GSI1PK: "USER",
                        GSI1SK: now,
                        ...user,
                },
                ConditionExpression: "attribute_not_exists(PK)",
        });

        try {
                await docClient.send(command);
                return user;
        } catch (error: any) {
                if (error.name === "ConditionalCheckFailedException") {
                        throw new Error("User already exists");
                }
                throw error;
        }
}

export async function getUserByEmail(email: string): Promise<User | null> {
        const command = new GetCommand({
                TableName: TABLE_NAME,
                Key: {
                        PK: `USER#${email}`,
                        SK: `PROFILE#${email}`,
                },
        });

        try {
                const result = await docClient.send(command);
                if (!result.Item) {
                        return null;
                }

                return {
                        email: result.Item.email,
                        name: result.Item.name,
                        password: result.Item.password,
                        createdAt: result.Item.createdAt,
                        updatedAt: result.Item.updatedAt,
                        role: result.Item.role || 'visitor',
                        avatar: result.Item.avatar,
                        bio: result.Item.bio,
                };
        } catch (error) {
                console.error("Error getting user:", error);
                return null;
        }
}

export async function updateUser(email: string, updates: Partial<User>): Promise<User | null> {
        const now = new Date().toISOString();

        const command = new PutCommand({
                TableName: TABLE_NAME,
                Item: {
                        PK: `USER#${email}`,
                        SK: `PROFILE#${email}`,
                        GSI1PK: "USER",
                        GSI1SK: updates.createdAt || now,
                        ...updates,
                        email,
                        updatedAt: now,
                },
        });

        try {
                await docClient.send(command);
                return await getUserByEmail(email);
        } catch (error) {
                console.error("Error updating user:", error);
                return null;
        }
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
        return bcrypt.compare(password, hashedPassword);
}

export async function getAllUsers(): Promise<User[]> {
        const command = new QueryCommand({
                TableName: TABLE_NAME,
                IndexName: "GSI1",
                KeyConditionExpression: "GSI1PK = :pk",
                ExpressionAttributeValues: {
                        ":pk": "USER",
                },
        });

        try {
                const result = await docClient.send(command);
                return result.Items?.map(item => ({
                        email: item.email,
                        name: item.name,
                        password: item.password,
                        createdAt: item.createdAt,
                        updatedAt: item.updatedAt,
                        role: item.role,
                        avatar: item.avatar,
                        bio: item.bio,
                })) || [];
        } catch (error) {
                console.error("Error getting all users:", error);
                return [];
        }
}
