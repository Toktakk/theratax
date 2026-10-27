import { InternalServerErrorException } from '@nestjs/common';
import { receiptLinkExpiry } from './receipt-link.js';
import {
  RECEIPT_OPEN_MESSAGE,
  RECEIPT_REMOVE_MESSAGE,
  RECEIPT_STORAGE_MESSAGE,
} from './receipt-limits.js';
import { receiptStorageKey } from './receipt-storage-key.js';
import { UploadService } from './upload.service.js';

describe('receipt links', () => {
  const previous = {
    S3_BUCKET: process.env.S3_BUCKET,
    S3_ENDPOINT: process.env.S3_ENDPOINT,
    S3_ACCESS_KEY: process.env.S3_ACCESS_KEY,
    S3_SECRET_KEY: process.env.S3_SECRET_KEY,
  };

  beforeAll(() => {
    process.env.S3_BUCKET = 'receipts';
    process.env.S3_ENDPOINT = 'http://localhost:9000';
    process.env.S3_ACCESS_KEY = 'theratax';
    process.env.S3_SECRET_KEY = 'theratax-secret';
  });

  afterAll(() => {
    restore('S3_BUCKET', previous.S3_BUCKET);
    restore('S3_ENDPOINT', previous.S3_ENDPOINT);
    restore('S3_ACCESS_KEY', previous.S3_ACCESS_KEY);
    restore('S3_SECRET_KEY', previous.S3_SECRET_KEY);
  });

  it('expires a signed link 15 minutes after it is issued', () => {
    expect(receiptLinkExpiry(0)).toEqual({
      expiresIn: 900,
      expiresAt: '1970-01-01T00:15:00.000Z',
    });
  });

  it('signs a legacy key and a generated key for 900 seconds', async () => {
    const service = new UploadService();
    const legacy = 'receipts/4/9';
    const generated = receiptStorageKey(
      4,
      9,
      '11111111-1111-4111-8111-111111111111',
    );
    const before = Date.now();
    const link = await service.signedReadUrl(legacy);
    const after = Date.now();
    const generatedLink = await service.signedReadUrl(generated);

    expect(link.url.startsWith('http://localhost:9000/')).toBe(true);
    expect(link.url).toContain('X-Amz-Expires=900');
    expect(generatedLink.url).toContain('X-Amz-Expires=900');
    const expiresAt = Date.parse(link.expiresAt);
    expect(expiresAt).toBeGreaterThanOrEqual(before + 15 * 60 * 1000);
    expect(expiresAt).toBeLessThanOrEqual(after + 15 * 60 * 1000);
  });

  it('does not sign or write a key outside the receipt prefix', async () => {
    const service = new UploadService();

    await expect(
      service.signedReadUrl('../receipts/4/9'),
    ).rejects.toMatchObject({
      message: RECEIPT_OPEN_MESSAGE,
    });
    await expect(
      service.putObject('../receipts/4/9', Buffer.from('x'), 'image/jpeg'),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
    await expect(
      service.deleteObject('receipts/4/9/not-a-uuid'),
    ).rejects.toMatchObject({
      message: RECEIPT_REMOVE_MESSAGE,
    });
    expect(() => receiptStorageKey(4, 9, '../slip')).toThrow(
      RECEIPT_STORAGE_MESSAGE,
    );
  });
});

function restore(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
    return;
  }
  process.env[name] = value;
}
