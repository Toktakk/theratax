import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { PublicUser } from '../auth/public-user.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  openReceipt,
  ownedTransactionWhere,
  receiptWrite,
  removeReceipt,
  storeReceipt,
} from './store-receipt.js';
import type {
  OwnedTransaction,
  Receipt,
  ReceiptUploadDeps,
  ReceiptUrl,
  ReceiptWrite,
} from './store-receipt.js';
import { UploadService } from './upload.service.js';

export type { Receipt, ReceiptUrl } from './store-receipt.js';

@Injectable()
export class ReceiptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
  ) {}

  upload(
    user: PublicUser,
    id: number,
    file: Express.Multer.File | undefined,
  ): Promise<Receipt> {
    return storeReceipt(this.deps(), user.id, id, file);
  }

  link(user: PublicUser, id: number): Promise<ReceiptUrl> {
    return openReceipt(this.deps(), user.id, id);
  }

  remove(user: PublicUser, id: number): Promise<void> {
    return removeReceipt(this.deps(), user.id, id);
  }

  private deps(): ReceiptUploadDeps {
    return {
      findTransaction: (userId, transactionId) =>
        this.findOwned(userId, transactionId),
      saveReceipt: (input) => this.saveReceipt(input),
      deleteReceipt: (transactionId) => this.deleteReceiptRow(transactionId),
      putObject: (key, body, contentType) =>
        this.uploadService.putObject(key, body, contentType),
      deleteObject: (key) => this.uploadService.deleteObject(key),
      signedReadUrl: (key) => this.uploadService.signedReadUrl(key),
      newObjectId: randomUUID,
    };
  }

  private async findOwned(
    userId: number,
    id: number,
  ): Promise<OwnedTransaction | null> {
    const transaction = await this.prisma.transaction.findFirst({
      where: ownedTransactionWhere(userId, id),
      include: { receipt: true },
    });
    if (transaction === null) {
      return null;
    }
    if (transaction.receipt === null) {
      return { receipt: null };
    }
    return { receipt: { storageKey: transaction.receipt.storageKey } };
  }

  private async saveReceipt(input: ReceiptWrite): Promise<Receipt> {
    const receipt = await this.prisma.receipt.upsert(receiptWrite(input));
    return {
      transactionId: receipt.transactionId,
      contentType: receipt.contentType,
      byteSize: receipt.byteSize,
    };
  }

  private async deleteReceiptRow(transactionId: number): Promise<void> {
    await this.prisma.receipt.delete({ where: { transactionId } });
  }
}
