import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { PublicUser } from '../auth/public-user.js';
import { RECEIPT_FILE_MESSAGE } from './receipt-upload.filter.js';
import { UploadService } from './upload.service.js';

const ACCEPTED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export interface Receipt {
  transactionId: number;
  contentType: string;
  byteSize: number;
}

export interface ReceiptUrl {
  url: string;
  expiresAt: string;
}

@Injectable()
export class ReceiptsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
  ) {}

  async upload(
    user: PublicUser,
    id: number,
    file: Express.Multer.File | undefined,
  ): Promise<Receipt> {
    await this.findTransaction(user.id, id);
    if (
      file === undefined ||
      file.size < 1 ||
      !ACCEPTED_TYPES.has(file.mimetype)
    ) {
      throw new BadRequestException(RECEIPT_FILE_MESSAGE);
    }
    const storageKey = `receipts/${user.id}/${id}`;
    await this.uploadService.putObject(storageKey, file.buffer, file.mimetype);
    const receipt = await this.prisma.receipt.upsert({
      where: { transactionId: id },
      create: {
        transactionId: id,
        contentType: file.mimetype,
        byteSize: file.size,
        storageKey,
      },
      update: {
        contentType: file.mimetype,
        byteSize: file.size,
        storageKey,
      },
    });
    return {
      transactionId: receipt.transactionId,
      contentType: receipt.contentType,
      byteSize: receipt.byteSize,
    };
  }

  async link(user: PublicUser, id: number): Promise<ReceiptUrl> {
    const transaction = await this.findTransaction(user.id, id);
    if (transaction.receipt === null) {
      throw new NotFoundException(`Receipt for transaction ${id} not found`);
    }
    return this.uploadService.signedReadUrl(transaction.receipt.storageKey);
  }

  async remove(user: PublicUser, id: number): Promise<void> {
    const transaction = await this.findTransaction(user.id, id);
    if (transaction.receipt === null) {
      throw new NotFoundException(`Receipt for transaction ${id} not found`);
    }
    await this.uploadService.deleteObject(transaction.receipt.storageKey);
    await this.prisma.receipt.delete({ where: { transactionId: id } });
  }

  private async findTransaction(userId: number, id: number) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id, userId },
      include: { receipt: true },
    });
    if (transaction === null) {
      throw new NotFoundException(`Transaction ${id} not found`);
    }
    return transaction;
  }
}
