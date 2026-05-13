import { DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch';

const ddb = new DynamoDBClient({ region: 'eu-north-1' });
const sns = new SNSClient({ region: 'eu-north-1' });
const cw = new CloudWatchClient({ region: 'eu-north-1' });

// Environment Variables (Professional Practice)
const USERS_TABLE = process.env.USERS_TABLE;
const AUDIT_LOG_TABLE = process.env.AUDIT_LOG_TABLE;
const SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN;

export const handler = async (event) => {
  console.log('👷 Assignment Worker triggered');

  for (const record of event.Records) {
    try {
      const snsMessage = JSON.parse(record.body);
      let taskData;
      
      try {
        taskData = typeof snsMessage.Message === 'string' ? JSON.parse(snsMessage.Message) : snsMessage.Message;
      } catch (e) {
        console.warn('⚠️ SNS Message was not JSON. Skipping structured processing.');
        continue; 
      }
      
      const { taskId, title, assigneeId, projectId, status } = taskData;
      console.log(`Processing assignment: Task ${taskId}`);

      // 1. Fetch User Email
      const userResult = await ddb.send(new GetItemCommand({
        TableName: USERS_TABLE,
        Key: { userId: { S: assigneeId } }
      }));

      const userEmail = userResult.Item?.email?.S || 'no-email@example.com';

      // 2. Log to AuditLog
      const timestamp = new Date().toISOString();
      await ddb.send(new PutItemCommand({
        TableName: AUDIT_LOG_TABLE,
        Item: {
          logId: { S: `ASSIGN-${taskId}-${Date.now()}` },
          taskId: { S: taskId },
          action: { S: 'TASK_ASSIGNED' },
          assigneeId: { S: assigneeId },
          assigneeEmail: { S: userEmail },
          timestamp: { S: timestamp }
        }
      }));

      // 3. Send Targeted Email
      await sns.send(new PublishCommand({
        TopicArn: SNS_TOPIC_ARN,
        Subject: `🎯 New Task: ${title}`,
        Message: `Task: ${title}\nProject: ${projectId}\nAssigned to: ${userEmail}\nTime: ${timestamp}`,
        MessageAttributes: {
          email: {
            DataType: 'String',
            StringValue: userEmail
          }
        }
      }));

      // 4. CloudWatch Metric
      await cw.send(new PutMetricDataCommand({
        Namespace: 'MiniJira/Analytics',
        MetricData: [{
          MetricName: 'AssignmentsProcessed',
          Value: 1,
          Unit: 'Count',
          Dimensions: [{ Name: 'ProjectID', Value: projectId }]
        }]
      }));

      console.log('✅ Successfully processed assignment');
    } catch (err) {
      console.error('❌ Error:', err);
    }
  }
  return { statusCode: 200 };
};
