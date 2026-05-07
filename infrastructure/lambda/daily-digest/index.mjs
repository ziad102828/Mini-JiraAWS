/**
 * ═══════════════════════════════════════════════════════════
 * Lambda: Daily Digest
 * ═══════════════════════════════════════════════════════════
 *
 * Trigger: EventBridge scheduled rule — cron(0 9 * * ? *)
 *          (Runs at 9:00 AM UTC every day)
 *
 * Action:
 *   1. Scans DynamoDB Tasks table for tasks due today
 *   2. Groups tasks by team
 *   3. Publishes a digest email via SNS
 *
 * Runtime: Node.js 20.x
 *
 * IAM Permissions needed:
 *   - dynamodb:Scan on Tasks table
 *   - sns:Publish to the digest SNS topic
 * ═══════════════════════════════════════════════════════════
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

const ddbClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: 'us-east-1' })
);
const snsClient = new SNSClient({ region: 'us-east-1' });

const TASKS_TABLE = process.env.TASKS_TABLE || 'MiniJira_Tasks';
const SNS_TOPIC_ARN = process.env.SNS_DIGEST_TOPIC_ARN;

export const handler = async (_event) => {
  console.log('📬 Daily Digest Lambda triggered');

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  console.log(`Looking for tasks due on: ${today}`);

  try {
    // 1. Scan for tasks with deadline = today (or overdue)
    const result = await ddbClient.send(
      new ScanCommand({
        TableName: TASKS_TABLE,
        FilterExpression: 'deadline <= :today AND #status <> :done',
        ExpressionAttributeValues: {
          ':today': today,
          ':done': 'Done',
        },
        ExpressionAttributeNames: {
          '#status': 'status',
        },
      })
    );

    const tasks = result.Items || [];
    console.log(`Found ${tasks.length} tasks due today or overdue`);

    if (tasks.length === 0) {
      console.log('No tasks due today. Skipping digest.');
      return { statusCode: 200, body: 'No tasks due today' };
    }

    // 2. Group tasks by team
    const tasksByTeam = {};
    for (const task of tasks) {
      const team = task.teamId || 'unassigned';
      if (!tasksByTeam[team]) tasksByTeam[team] = [];
      tasksByTeam[team].push(task);
    }

    // 3. Build digest message
    let message = `📋 Mini-Jira Daily Digest — ${today}\n`;
    message += '═'.repeat(50) + '\n\n';

    for (const [teamId, teamTasks] of Object.entries(tasksByTeam)) {
      message += `🏷️ Team: ${teamId}\n`;
      message += '─'.repeat(30) + '\n';

      for (const task of teamTasks) {
        const isOverdue = task.deadline < today;
        const flag = isOverdue ? '🔴 OVERDUE' : '🟡 Due Today';
        message += `  ${flag} | ${task.title}\n`;
        message += `    Status: ${task.status} | Priority: ${task.priority}\n`;
        message += `    Assignee: ${task.assigneeId || 'Unassigned'}\n\n`;
      }
    }

    message += `\nTotal: ${tasks.length} task(s) requiring attention.\n`;

    // 4. Publish to SNS
    if (SNS_TOPIC_ARN) {
      await snsClient.send(
        new PublishCommand({
          TopicArn: SNS_TOPIC_ARN,
          Subject: `Mini-Jira Daily Digest — ${today}`,
          Message: message,
        })
      );
      console.log('✅ Digest email sent via SNS');
    } else {
      console.warn('⚠️ SNS_DIGEST_TOPIC_ARN not set. Digest printed to logs only.');
      console.log(message);
    }

    return {
      statusCode: 200,
      body: `Digest sent with ${tasks.length} task(s)`,
    };
  } catch (err) {
    console.error('❌ Daily Digest failed:', err);
    throw err;
  }
};
