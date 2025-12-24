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
        // Enhanced verification fields
        alternativeNames?: string[]; // Other names user publishes under (maiden name, etc.)
        orcid?: string; // ORCID researcher ID
        institution?: string; // Academic institution
        department?: string; // Department/field
        researcherProfile?: string; // Google Scholar, ResearchGate, etc.
        verificationStatus?: 'unverified' | 'pending' | 'verified';
        verifiedAt?: string;
}

export interface CreateUserOptions {
        email: string;
        name: string;
        password: string;
        institution?: string;
        department?: string;
        orcid?: string;
        alternativeNames?: string[];
        verificationStatus?: 'unverified' | 'pending' | 'verified';
}

export async function createUser(
        email: string,
        name: string,
        password: string,
        options?: Partial<CreateUserOptions>
): Promise<User> {
        const hashedPassword = password ? await bcrypt.hash(password, 12) : "";
        const now = new Date().toISOString();

        const user: User = {
                email,
                name,
                password: hashedPassword,
                createdAt: now,
                updatedAt: now,
                role: "visitor",
                verificationStatus: options?.verificationStatus || "unverified",
                institution: options?.institution,
                department: options?.department,
                orcid: options?.orcid,
                alternativeNames: options?.alternativeNames || [],
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
                        alternativeNames: result.Item.alternativeNames || [],
                        orcid: result.Item.orcid,
                        institution: result.Item.institution,
                        department: result.Item.department,
                        researcherProfile: result.Item.researcherProfile,
                        verificationStatus: result.Item.verificationStatus || 'unverified',
                        verifiedAt: result.Item.verifiedAt,
                };
        } catch (error) {
                console.error("Error getting user:", error);
                return null;
        }
}

export async function updateUser(email: string, updates: Partial<User>): Promise<User | null> {
	const now = new Date().toISOString();

	// Get existing user to preserve fields not being updated
	const existingUser = await getUserByEmail(email);
	if (!existingUser) {
		console.error("User not found for update:", email);
		return null;
	}

	const command = new PutCommand({
		TableName: TABLE_NAME,
		Item: {
			PK: `USER#${email}`,
			SK: `PROFILE#${email}`,
			GSI1PK: "USER",
			GSI1SK: existingUser.createdAt,
			...existingUser,
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

export async function verifyUserEmail(email: string): Promise<boolean> {
        const now = new Date().toISOString();
        try {
                await updateUser(email, {
                        verificationStatus: 'verified',
                        verifiedAt: now,
                        updatedAt: now,
                });
                return true;
        } catch (error) {
                console.error("Error verifying user email:", error);
                return false;
        }
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
	if (!hashedPassword) {
		return false;
	}
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
                        alternativeNames: item.alternativeNames || [],
                        orcid: item.orcid,
                        institution: item.institution,
                        department: item.department,
                        researcherProfile: item.researcherProfile,
                        verificationStatus: item.verificationStatus || 'unverified',
                        verifiedAt: item.verifiedAt,
                })) || [];
        } catch (error) {
                console.error("Error getting all users:", error);
                return [];
        }
}
