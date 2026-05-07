import { Router } from 'express';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { authenticate } from '../middleware/auth.js';
import { s3Client, S3_BUCKETS } from '../config/s3.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
router.use(authenticate);

// Allowed image MIME types
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * POST /api/upload/presigned-url
 * Generate a presigned S3 PUT URL for the client to upload directly to S3.
 * Body: { fileName, fileType, taskId }
 * Returns: { uploadUrl, key }
 */
router.post('/presigned-url', async (req, res, next) => {
  try {
    const { fileName, fileType, taskId } = req.body;

    if (!fileName || !fileType) {
      return res.status(400).json({ error: 'Missing required fields: fileName, fileType' });
    }

    if (!ALLOWED_TYPES.includes(fileType)) {
      return res.status(400).json({
        error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}`,
      });
    }

    // Generate a unique S3 key: tasks/<taskId>/<uuid>-<filename>
    const extension = fileName.split('.').pop();
    const key = `tasks/${taskId || 'unassigned'}/${uuidv4()}.${extension}`;

    const command = new PutObjectCommand({
      Bucket: S3_BUCKETS.ORIGINALS,
      Key: key,
      ContentType: fileType,
    });

    // URL expires in 5 minutes
    const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

    res.json({
      uploadUrl,
      key,
      bucket: S3_BUCKETS.ORIGINALS,
      expiresIn: 300,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
