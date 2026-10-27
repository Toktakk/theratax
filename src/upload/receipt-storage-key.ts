import { InternalServerErrorException } from '@nestjs/common';
import { RECEIPT_STORAGE_MESSAGE } from './receipt-limits.js';

const LEGACY_KEY = /^receipts\/[0-9]+\/[0-9]+$/;
const OBJECT_KEY =
  /^receipts\/[0-9]+\/[0-9]+\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function isReceiptStorageKey(key: string): boolean {
  return LEGACY_KEY.test(key) || OBJECT_KEY.test(key);
}

export function receiptStorageKey(
  userId: number,
  transactionId: number,
  objectId: string,
): string {
  const key = `receipts/${userId}/${transactionId}/${objectId}`;
  if (!OBJECT_KEY.test(key)) {
    throw new InternalServerErrorException(RECEIPT_STORAGE_MESSAGE);
  }
  return key;
}
