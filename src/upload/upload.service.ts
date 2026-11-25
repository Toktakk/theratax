import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
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

function errorCode(error: unknown): string {
  if (typeof error !== 'object' || error === null) {
    return '';
  }
  if ('Code' in error && typeof error.Code === 'string' && error.Code !== '') {
    return error.Code;
  }
  if ('name' in error && typeof error.name === 'string') {
    return error.name;
  }
  return '';
}

function statusCode(error: unknown): number | undefined {
  if (typeof error !== 'object' || error === null || !('$metadata' in error)) {
    return undefined;
  }
  const metadata = error.$metadata;
  if (
    typeof metadata !== 'object' ||
    metadata === null ||
    !('httpStatusCode' in metadata)
  ) {
    return undefined;
  }
  return typeof metadata.httpStatusCode === 'number'
    ? metadata.httpStatusCode
    : undefined;
}

function bucketAlreadyExists(error: unknown): boolean {
  const code = errorCode(error);
  const message =
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
      ? error.message.toLowerCase()
      : '';
  return (
    code === 'BucketAlreadyOwnedByYou' ||
    code === 'BucketAlreadyExists' ||
    message.includes('already exist') ||
    message.includes('already own')
  );
}

function bucketMissing(error: unknown): boolean {
  const code = errorCode(error);
  return code === 'NotFound' || code === 'NoSuchBucket' || statusCode(error) === 404;
}

function isAccessDenied(error: unknown): boolean {
  return errorCode(error) === 'AccessDenied' || statusCode(error) === 403;
}

@Injectable()
export class UploadService implements OnModuleInit {
  private readonly logger = new Logger(UploadService.name);
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
    if (await this.bucketIsPresent()) {
      return;
    }
    try {
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
    } catch (error: unknown) {
      if (bucketAlreadyExists(error) || (await this.bucketIsPresent())) {
        return;
      }
      if (isAccessDenied(error)) {
        this.logger.warn(
          `S3 denied CreateBucket for "${this.bucket}". The API will use that Space as it is.`,
        );
        return;
      }
      throw error;
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

  private async bucketIsPresent(): Promise<boolean> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      return true;
    } catch (error: unknown) {
      if (bucketMissing(error) || isAccessDenied(error)) {
        return false;
      }
      throw error;
    }
  }

  private assertKey(key: string, message: string): void {
    if (!isReceiptStorageKey(key)) {
      throw new InternalServerErrorException(message);
    }
  }
}
