import {
  Injectable,
  InternalServerErrorException,
  OnModuleInit,
} from '@nestjs/common';
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { receiptLinkExpiry } from './receipt-link.js';
import {
  RECEIPT_OPEN_MESSAGE,
  RECEIPT_REMOVE_MESSAGE,
  RECEIPT_STORAGE_MESSAGE,
} from './receipt-limits.js';
import { isReceiptStorageKey } from './receipt-storage-key.js';

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.length === 0) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

function bucketAlreadyExists(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const name =
    'name' in error && typeof error.name === 'string' ? error.name : '';
  const message =
    'message' in error && typeof error.message === 'string'
      ? error.message
      : '';
  const lowered = message.toLowerCase();
  return (
    name === 'BucketAlreadyOwnedByYou' ||
    name === 'BucketAlreadyExists' ||
    lowered.includes('already exist') ||
    lowered.includes('already own')
  );
}

@Injectable()
export class UploadService implements OnModuleInit {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    this.bucket = requiredEnv('S3_BUCKET');
    this.client = new S3Client({
      region: process.env.S3_REGION ?? 'us-east-1',
      endpoint: requiredEnv('S3_ENDPOINT'),
      forcePathStyle: true,
      // Default checksums are rejected by MinIO and break a plain GET of the signed link.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
      credentials: {
        accessKeyId: requiredEnv('S3_ACCESS_KEY'),
        secretAccessKey: requiredEnv('S3_SECRET_KEY'),
      },
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
    } catch (error: unknown) {
      if (!bucketAlreadyExists(error)) {
        throw error;
      }
    }
  }

  async putObject(
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<void> {
    this.assertKey(key, RECEIPT_STORAGE_MESSAGE);
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
        }),
      );
    } catch {
      throw new InternalServerErrorException(RECEIPT_STORAGE_MESSAGE);
    }
  }

  async deleteObject(key: string): Promise<void> {
    this.assertKey(key, RECEIPT_REMOVE_MESSAGE);
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
    } catch {
      throw new InternalServerErrorException(RECEIPT_REMOVE_MESSAGE);
    }
  }

  async signedReadUrl(
    key: string,
  ): Promise<{ url: string; expiresAt: string }> {
    this.assertKey(key, RECEIPT_OPEN_MESSAGE);
    const expiry = receiptLinkExpiry(Date.now());
    try {
      const url = await getSignedUrl(
        this.client,
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
        { expiresIn: expiry.expiresIn },
      );
      return { url, expiresAt: expiry.expiresAt };
    } catch {
      throw new InternalServerErrorException(RECEIPT_OPEN_MESSAGE);
    }
  }

  private assertKey(key: string, message: string): void {
    if (!isReceiptStorageKey(key)) {
      throw new InternalServerErrorException(message);
    }
  }
}
