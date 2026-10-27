import { Readable } from 'node:stream';
import type { PublicUser } from '../auth/public-user.js';
import { asDependency, prismaDouble } from '../../test/prisma-stub.js';
import { ReceiptsService } from './receipts.service.js';
import type { UploadService } from './upload.service.js';

const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC';

const user: PublicUser = {
  id: 4,
  email: 'ada@example.com',
  name: 'Ada',
  practiceType: 'mobile',
  expenseMethod: 'flat_rate',
  onboardedAt: '2026-04-06T12:00:00.000Z',
};

function imageFile(): Express.Multer.File {
  const buffer = Buffer.from(PNG_BASE64, 'base64');
  return {
    fieldname: 'file',
    originalname: 'slip.txt',
    encoding: '7bit',
    mimetype: 'text/plain',
    size: buffer.length,
    buffer,
    stream: Readable.from(buffer),
    destination: '',
    filename: '',
    path: '',
  };
}

function uploadDouble() {
  return {
    putObject: vi.fn().mockResolvedValue(undefined),
    deleteObject: vi.fn().mockResolvedValue(undefined),
    signedReadUrl: vi.fn().mockResolvedValue({
      url: 'https://files.example/receipt',
      expiresAt: '2026-05-01T00:15:00.000Z',
    }),
  };
}

describe('ReceiptsService', () => {
  it('looks up the transaction for this user and upserts one receipt row', async () => {
    const { prisma, db } = prismaDouble();
    const bytes = Buffer.from(PNG_BASE64, 'base64');
    db.transaction.findFirst.mockResolvedValue({ receipt: null });
    db.receipt.upsert.mockResolvedValue({
      transactionId: 9,
      contentType: 'image/png',
      byteSize: bytes.length,
    });
    const upload = uploadDouble();
    const service = new ReceiptsService(prisma, asDependency<UploadService>(upload));

    const saved = await service.upload(user, 9, imageFile());

    expect(saved.transactionId).toBe(9);
    expect(db.transaction.findFirst).toHaveBeenCalledWith({
      where: { id: 9, userId: 4 },
      include: { receipt: true },
    });
    expect(db.receipt.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { transactionId: 9 },
        create: expect.objectContaining({ transactionId: 9, contentType: 'image/png' }),
      }),
    );
  });

  it('opens a stored receipt for this user', async () => {
    const { prisma, db } = prismaDouble();
    db.transaction.findFirst.mockResolvedValue({
      receipt: { storageKey: 'receipts/4/9', contentType: 'image/png' },
    });
    const upload = uploadDouble();
    const service = new ReceiptsService(prisma, asDependency<UploadService>(upload));

    const link = await service.link(user, 9);

    expect(link.url).toBe('https://files.example/receipt');
    expect(link.contentType).toBe('image/png');
    expect(db.transaction.findFirst).toHaveBeenCalledWith({
      where: { id: 9, userId: 4 },
      include: { receipt: true },
    });
    expect(upload.signedReadUrl).toHaveBeenCalledWith('receipts/4/9');
  });

  it('deletes the object and then the receipt row', async () => {
    const { prisma, db } = prismaDouble();
    db.transaction.findFirst.mockResolvedValue({
      receipt: { storageKey: 'receipts/4/9', contentType: 'image/png' },
    });
    db.receipt.delete.mockResolvedValue({});
    const upload = uploadDouble();
    const service = new ReceiptsService(prisma, asDependency<UploadService>(upload));

    await service.remove(user, 9);

    expect(upload.deleteObject).toHaveBeenCalledWith('receipts/4/9');
    expect(db.receipt.delete).toHaveBeenCalledWith({ where: { transactionId: 9 } });
  });
});
