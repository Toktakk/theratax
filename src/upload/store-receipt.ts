import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ownedByUser } from '../auth/owned-by-user.js';
import { detectReceiptFile } from './image-type.js';
import type { ReceiptFileType } from './image-type.js';
import {
  MAX_RECEIPT_BYTES,
  RECEIPT_FILE_MESSAGE,
  RECEIPT_OPEN_MESSAGE,
  RECEIPT_REMOVE_MESSAGE,
  RECEIPT_STORAGE_MESSAGE,
} from './receipt-limits.js';
import {
  isReceiptStorageKey,
  receiptStorageKey,
} from './receipt-storage-key.js';

export interface Receipt {
  transactionId: number;
  contentType: string;
  byteSize: number;
}

export interface SignedReceiptUrl {
  url: string;
  expiresAt: string;
}

export interface ReceiptUrl extends SignedReceiptUrl {
  contentType: string;
}

export interface OwnedTransaction {
  receipt: { storageKey: string; contentType: string } | null;
}

export interface ReceiptWrite {
  transactionId: number;
  contentType: string;
  byteSize: number;
  storageKey: string;
}

export function ownedTransactionWhere(
  userId: number,
  id: number,
): {
  id: number;
  userId: number;
} {
  return ownedByUser(userId, id);
}

export function receiptWrite(input: ReceiptWrite): {
  where: { transactionId: number };
  create: ReceiptWrite;
  update: Pick<ReceiptWrite, 'contentType' | 'byteSize' | 'storageKey'>;
} {
  return {
    where: { transactionId: input.transactionId },
    create: {
      transactionId: input.transactionId,
      contentType: input.contentType,
      byteSize: input.byteSize,
      storageKey: input.storageKey,
    },
    update: {
      contentType: input.contentType,
      byteSize: input.byteSize,
      storageKey: input.storageKey,
    },
  };
}

export interface ReceiptUploadDeps {
  findTransaction: (
    userId: number,
    id: number,
  ) => Promise<OwnedTransaction | null>;
  saveReceipt: (input: ReceiptWrite) => Promise<Receipt>;
  deleteReceipt: (transactionId: number) => Promise<void>;
  putObject: (key: string, body: Buffer, contentType: string) => Promise<void>;
  deleteObject: (key: string) => Promise<void>;
  signedReadUrl: (key: string) => Promise<SignedReceiptUrl>;
  newObjectId: () => string;
}

export async function storeReceipt(
  deps: ReceiptUploadDeps,
  userId: number,
  id: number,
  file: Express.Multer.File | undefined,
): Promise<Receipt> {
  const transaction = await findOwned(deps, userId, id);
  const image = inspectReceiptFile(file);
  const storageKey = receiptStorageKey(userId, id, deps.newObjectId());
  try {
    await deps.putObject(storageKey, image.bytes, image.contentType);
  } catch {
    throw new InternalServerErrorException(RECEIPT_STORAGE_MESSAGE);
  }
  let saved: Receipt;
  try {
    saved = await deps.saveReceipt({
      transactionId: id,
      contentType: image.contentType,
      byteSize: image.byteSize,
      storageKey,
    });
  } catch {
    await forgetObject(deps, storageKey);
    throw new InternalServerErrorException(RECEIPT_STORAGE_MESSAGE);
  }
  await forgetPrevious(deps, transaction.receipt, storageKey);
  return saved;
}

export async function openReceipt(
  deps: ReceiptUploadDeps,
  userId: number,
  id: number,
): Promise<ReceiptUrl> {
  const transaction = await findOwned(deps, userId, id);
  if (transaction.receipt === null) {
    throw new NotFoundException(`Receipt for transaction ${id} not found`);
  }
  if (!isReceiptStorageKey(transaction.receipt.storageKey)) {
    throw new InternalServerErrorException(RECEIPT_OPEN_MESSAGE);
  }
  try {
    const signed = await deps.signedReadUrl(transaction.receipt.storageKey);
    return {
      url: signed.url,
      expiresAt: signed.expiresAt,
      contentType: transaction.receipt.contentType,
    };
  } catch {
    throw new InternalServerErrorException(RECEIPT_OPEN_MESSAGE);
  }
}

export async function removeReceipt(
  deps: ReceiptUploadDeps,
  userId: number,
  id: number,
): Promise<void> {
  const transaction = await findOwned(deps, userId, id);
  if (transaction.receipt === null) {
    throw new NotFoundException(`Receipt for transaction ${id} not found`);
  }
  if (!isReceiptStorageKey(transaction.receipt.storageKey)) {
    throw new InternalServerErrorException(RECEIPT_REMOVE_MESSAGE);
  }
  try {
    await deps.deleteObject(transaction.receipt.storageKey);
  } catch {
    throw new InternalServerErrorException(RECEIPT_REMOVE_MESSAGE);
  }
  try {
    await deps.deleteReceipt(id);
  } catch {
    throw new InternalServerErrorException(RECEIPT_REMOVE_MESSAGE);
  }
}

function inspectReceiptFile(file: Express.Multer.File | undefined): {
  bytes: Buffer;
  contentType: ReceiptFileType;
  byteSize: number;
} {
  if (
    file === undefined ||
    file.size < 1 ||
    file.size > MAX_RECEIPT_BYTES ||
    file.buffer.length !== file.size
  ) {
    throw new BadRequestException(RECEIPT_FILE_MESSAGE);
  }
  const contentType = detectReceiptFile(file.buffer);
  if (contentType === null) {
    throw new BadRequestException(RECEIPT_FILE_MESSAGE);
  }
  return {
    bytes: file.buffer,
    contentType,
    byteSize: file.buffer.length,
  };
}

async function findOwned(
  deps: ReceiptUploadDeps,
  userId: number,
  id: number,
): Promise<OwnedTransaction> {
  const transaction = await deps.findTransaction(userId, id);
  if (transaction === null) {
    throw new NotFoundException(`Transaction ${id} not found`);
  }
  return transaction;
}

async function forgetPrevious(
  deps: ReceiptUploadDeps,
  previous: { storageKey: string } | null,
  storageKey: string,
): Promise<void> {
  if (previous === null || previous.storageKey === storageKey) {
    return;
  }
  if (!isReceiptStorageKey(previous.storageKey)) {
    return;
  }
  await forgetObject(deps, previous.storageKey);
}

async function forgetObject(
  deps: ReceiptUploadDeps,
  key: string,
): Promise<void> {
  try {
    await deps.deleteObject(key);
  } catch {
    return;
  }
}
