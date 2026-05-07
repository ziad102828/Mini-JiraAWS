/**
 * ═══════════════════════════════════════════════════════════
 * Lambda: Image Resize
 * ═══════════════════════════════════════════════════════════
 *
 * Trigger: S3 PUT event on the originals bucket
 * Action:  Reads the uploaded image, resizes it to a thumbnail
 *          (300x300 max), and writes it to the resized bucket.
 *
 * Runtime: Node.js 20.x
 * Layer:   Include `sharp` as a Lambda Layer or bundle it.
 *
 * IAM Permissions needed:
 *   - s3:GetObject on originals bucket
 *   - s3:PutObject on resized bucket
 * ═══════════════════════════════════════════════════════════
 */

import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';

const s3 = new S3Client({ region: 'eu-north-1' });
const RESIZED_BUCKET = process.env.RESIZED_BUCKET || 'minijira-resized';
const MAX_WIDTH = 300;
const MAX_HEIGHT = 300;

export const handler = async (event) => {
  console.log('📸 Image Resize Lambda triggered');
  console.log('Event:', JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    const sourceBucket = record.s3.bucket.name;
    const sourceKey = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

    console.log(`Processing: s3://${sourceBucket}/${sourceKey}`);

    try {
      // 1. Get the original image from S3
      const getCommand = new GetObjectCommand({
        Bucket: sourceBucket,
        Key: sourceKey,
      });
      const response = await s3.send(getCommand);
      const imageBuffer = Buffer.from(await response.Body.transformToByteArray());

      // 2. Resize with sharp
      const resizedBuffer = await sharp(imageBuffer)
        .resize(MAX_WIDTH, MAX_HEIGHT, {
          fit: 'inside',          // Maintain aspect ratio
          withoutEnlargement: true, // Don't upscale small images
        })
        .jpeg({ quality: 80 })
        .toBuffer();

      // 3. Upload the resized image to the resized bucket
      const destKey = `thumbnails/${sourceKey}`;
      const putCommand = new PutObjectCommand({
        Bucket: RESIZED_BUCKET,
        Key: destKey,
        Body: resizedBuffer,
        ContentType: 'image/jpeg',
        Metadata: {
          'original-bucket': sourceBucket,
          'original-key': sourceKey,
        },
      });
      await s3.send(putCommand);

      console.log(`✅ Resized and saved to s3://${RESIZED_BUCKET}/${destKey}`);
    } catch (err) {
      console.error(`❌ Failed to process ${sourceKey}:`, err);
      throw err; // Re-throw to mark Lambda invocation as failed
    }
  }

  return { statusCode: 200, body: 'Images processed successfully' };
};
