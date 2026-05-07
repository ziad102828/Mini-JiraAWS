import { PutCommand, GetCommand, UpdateCommand, ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAMES } from '../config/dynamodb.js';

/**
 * User Service — DynamoDB operations for the Users table.
 *
 * ⚠️ Note: Users are primarily managed in Cognito. This table acts as a
 *    local cache/extension for quick lookups (e.g., team member lists)
 *    without hitting the Cognito API on every request.
 */

/**
 * Create or update a user record in DynamoDB.
 * Called during first login or when user attributes change.
 */
export async function upsertUser(userData) {
  const user = {
    userId: userData.userId,
    email: userData.email,
    name: userData.name,
    role: userData.role || 'employee',
    teamId: userData.teamId || null,
    updatedAt: new Date().toISOString(),
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAMES.USERS,
      Item: user,
    })
  );

  return user;
}

export async function getUserById(userId) {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAMES.USERS,
      Key: { userId },
    })
  );
  return result.Item || null;
}

export async function getAllUsers() {
  const result = await docClient.send(
    new ScanCommand({
      TableName: TABLE_NAMES.USERS,
    })
  );
  return result.Items || [];
}

/**
 * Get all users belonging to a specific team.
 * Uses GSI: teamId-index
 */
export async function getUsersByTeam(teamId) {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAMES.USERS,
      IndexName: 'teamId-index',
      KeyConditionExpression: 'teamId = :teamId',
      ExpressionAttributeValues: {
        ':teamId': teamId,
      },
    })
  );
  return result.Items || [];
}

/**
 * Assign a user to a team. Updates both the teamId field in DynamoDB.
 * ⚠️ You should also update the Cognito custom:teamId attribute separately.
 */
export async function assignUserToTeam(userId, teamId) {
  const result = await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAMES.USERS,
      Key: { userId },
      UpdateExpression: 'SET teamId = :teamId, updatedAt = :now',
      ExpressionAttributeValues: {
        ':teamId': teamId,
        ':now': new Date().toISOString(),
      },
      ReturnValues: 'ALL_NEW',
    })
  );

  return result.Attributes;
}
