import { PutCommand, GetCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAMES } from '../config/dynamodb.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Comment Service — DynamoDB operations for the Comments table.
 *
 * Comments table schema:
 *   PK: commentId
 *   GSI: taskId-createdAt-index (PK=taskId, SK=createdAt)
 */

export async function createComment(data) {
  const comment = {
    commentId: uuidv4(),
    taskId: data.taskId,
    authorId: data.authorId,
    authorName: data.authorName || 'Unknown',
    content: data.content,
    createdAt: new Date().toISOString(),
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAMES.COMMENTS,
      Item: comment,
    })
  );

  return comment;
}

export async function getCommentById(commentId) {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAMES.COMMENTS,
      Key: { commentId },
    })
  );
  return result.Item || null;
}

/**
 * Get all comments for a task, ordered by creation time.
 * Uses GSI: taskId-createdAt-index
 */
export async function getCommentsByTask(taskId) {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAMES.COMMENTS,
      IndexName: 'taskId-createdAt-index',
      KeyConditionExpression: 'taskId = :taskId',
      ExpressionAttributeValues: {
        ':taskId': taskId,
      },
      ScanIndexForward: true, // oldest first (chronological)
    })
  );
  return result.Items || [];
}

export async function deleteComment(commentId) {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE_NAMES.COMMENTS,
      Key: { commentId },
    })
  );
}
