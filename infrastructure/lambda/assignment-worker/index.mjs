/**
 * ═══════════════════════════════════════════════════════════
 * Lambda: Assignment Worker
 * ═══════════════════════════════════════════════════════════
 *
 * Trigger: SQS queue (MiniJira-AssignmentQueue)
 * Action:
 *   1. Reads task assignment messages from SQS
 *   2. Writes an activity log entry to DynamoDB (AuditLog)
 *   3. Publishes a custom CloudWatch metric: TasksAssignedPerTeam
 *
 * Runtime: Node.js 20.x
 *
 * IAM Permissions needed:
 *   - sqs:ReceiveMessage, sqs:DeleteMessage
 *   - dynamodb:PutItem on AuditLog table
 *   - cloudwatch:PutMetricData
 * ═══════════════════════════════════════════════════════════
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';

const ddbClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: 'eu-north-1' })
);
const cwClient = new CloudWatchClient({ region: 'eu-north-1' });

const AUDIT_TABLE = process.env.AUDIT_TABLE || 'MiniJira_AuditLog';

export const handler = async (event) => {
  console.log('📋 Assignment Worker Lambda triggered');
  console.log(`Processing ${event.Records.length} message(s)`);

  for (const record of event.Records) {
    try {
      const message = JSON.parse(record.body);

      // The SNS message wraps the actual payload
      const payload = message.Message ? JSON.parse(message.Message) : message;

      console.log('Processing assignment:', payload);

      // 1. Write activity log to DynamoDB AuditLog table
      await ddbClient.send(
        new PutCommand({
          TableName: AUDIT_TABLE,
          Item: {
            taskId: payload.taskId,
            timestamp: payload.timestamp || new Date().toISOString(),
            actorId: payload.createdBy || 'system',
            fromStatus: 'none',
            toStatus: 'To Do',
            eventType: 'TASK_ASSIGNED',
            assigneeId: payload.assigneeId,
            teamId: payload.teamId,
          },
        })
      );

      // 2. Publish CloudWatch custom metric: TasksAssignedPerTeam
      await cwClient.send(
        new PutMetricDataCommand({
          Namespace: 'MiniJira',
          MetricData: [
            {
              MetricName: 'TasksAssignedPerTeam',
              Dimensions: [
                {
                  Name: 'TeamId',
                  Value: payload.teamId || 'unknown',
                },
              ],
              Value: 1,
              Unit: 'Count',
              Timestamp: new Date(),
            },
          ],
        })
      );

      console.log(`✅ Processed assignment for task ${payload.taskId}`);
    } catch (err) {
      console.error('❌ Failed to process SQS message:', err);
      // Don't throw — allows other messages in the batch to process
      // The failed message will return to the queue after visibility timeout
    }
  }

  return { statusCode: 200, body: `Processed ${event.Records.length} messages` };
};
