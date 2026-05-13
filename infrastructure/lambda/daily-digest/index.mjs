import { DynamoDBClient, ScanCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

const ddb = new DynamoDBClient({ region: 'eu-north-1' });
const sns = new SNSClient({ region: 'eu-north-1' });

const TASKS_TABLE = process.env.TASKS_TABLE;
const USERS_TABLE = process.env.USERS_TABLE;
const SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN;

export const handler = async (event) => {
  console.log('📅 Daily Digest Lambda triggered');

  try {
    // 1. Scan for all tasks (for a demo, Scan is okay; for production, use an Index on dueDate)
    const tasksResult = await ddb.send(new ScanCommand({ TableName: TASKS_TABLE }));
    const allTasks = tasksResult.Items || [];

    // 2. Filter for tasks due today or overdue
    const today = new Date().toISOString().split('T')[0];
    const pendingTasks = allTasks.filter(item => {
      const dueDate = item.dueDate?.S;
      return dueDate && dueDate <= today && item.status?.S !== 'DONE';
    });

    if (pendingTasks.length === 0) {
      console.log('✅ No pending tasks for today.');
      return { statusCode: 200, body: 'No tasks to notify' };
    }

    // 3. Group tasks by assigneeId
    const grouped = pendingTasks.reduce((acc, task) => {
      const userId = task.assigneeId?.S;
      if (!userId) return acc;
      if (!acc[userId]) acc[userId] = [];
      acc[userId].push(task.title?.S);
      return acc;
    }, {});

    // 4. Send a summary to each user
    for (const [userId, taskTitles] of Object.entries(grouped)) {
      // Fetch user email
      const userResult = await ddb.send(new GetItemCommand({
        TableName: USERS_TABLE,
        Key: { userId: { S: userId } }
      }));
      
      const email = userResult.Item?.email?.S;
      if (!email) continue;

      console.log(`📡 Sending digest to ${email}...`);
      await sns.send(new PublishCommand({
        TopicArn: SNS_TOPIC_ARN,
        Subject: '📝 Your Daily Mini-Jira Digest',
        Message: `Hello!\n\nYou have ${taskTitles.length} tasks pending/due today:\n\n- ${taskTitles.join('\n- ')}\n\nHave a productive day!`,
        MessageAttributes: {
          email: { DataType: 'String', StringValue: email }
        }
      }));
    }

    console.log('✅ All digests sent successfully');
  } catch (err) {
    console.error('❌ Error generating digest:', err);
  }

  return { statusCode: 200 };
};
