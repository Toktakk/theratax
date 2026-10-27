import { Readable } from 'node:stream';
import {
  BadRequestException,
  HttpException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { detectReceiptImage } from './image-type.js';
import {
  MAX_RECEIPT_BYTES,
  RECEIPT_FILE_MESSAGE,
  RECEIPT_OPEN_MESSAGE,
  RECEIPT_REMOVE_MESSAGE,
  RECEIPT_STORAGE_MESSAGE,
} from './receipt-limits.js';
import { receiptStorageKey } from './receipt-storage-key.js';
import {
  openReceipt,
  ownedTransactionWhere,
  receiptWrite,
  removeReceipt,
  storeReceipt,
} from './store-receipt.js';
import type { OwnedTransaction, ReceiptUploadDeps } from './store-receipt.js';

const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC';

const USER_ID = 4;
const OTHER_USER_ID = 8;
const TX_ID = 9;
const FIRST_ID = '11111111-1111-4111-8111-111111111111';
const SECOND_ID = '22222222-2222-4222-8222-222222222222';

describe('receipt upload', () => {
  it('limits a query to the signed-in user', () => {
    expect(ownedTransactionWhere(USER_ID, TX_ID)).toEqual({
      id: TX_ID,
      userId: USER_ID,
    });
    expect(ownedTransactionWhere(OTHER_USER_ID, TX_ID).userId).toBe(
      OTHER_USER_ID,
    );
  });

  it('upserts one receipt row for a transaction', () => {
    const key = receiptStorageKey(USER_ID, TX_ID, FIRST_ID);
    const write = receiptWrite({
      transactionId: TX_ID,
      contentType: 'image/png',
      byteSize: 12,
      storageKey: key,
    });

    expect(write.where).toEqual({ transactionId: TX_ID });
    expect(write.create.transactionId).toBe(TX_ID);
    expect(write.update.storageKey).toBe(key);
  });

  it('stores a camera image and ignores the supplied type and filename', async () => {
    const deps = fakeDeps();
    const file = imageFile('application/octet-stream', '../../slip.jpg');

    const saved = await storeReceipt(deps.deps, USER_ID, TX_ID, file);

    expect(saved).toEqual({
      transactionId: TX_ID,
      contentType: 'image/png',
      byteSize: file.size,
    });
    expect(saved).not.toHaveProperty('url');
    expect(deps.putObject).toHaveBeenCalledWith(
      receiptStorageKey(USER_ID, TX_ID, FIRST_ID),
      file.buffer,
      'image/png',
    );
    const storedKey = deps.putObject.mock.calls[0]?.[0];
    expect(storedKey).toBe(receiptStorageKey(USER_ID, TX_ID, FIRST_ID));
    expect(storedKey).not.toContain('slip');
    expect(storedKey).not.toContain('secret');
    expect(deps.deleteObject).not.toHaveBeenCalled();
  });

  it('replaces the previous photo without adding a second row', async () => {
    const deps = fakeDeps();
    const previous = receiptStorageKey(USER_ID, TX_ID, FIRST_ID);
    deps.findTransaction.mockResolvedValueOnce({
      receipt: { storageKey: previous },
    });
    deps.newObjectId.mockReturnValueOnce(SECOND_ID);

    await storeReceipt(
      deps.deps,
      USER_ID,
      TX_ID,
      imageFile('image/png', 'again.png'),
    );

    expect(deps.saveReceipt).toHaveBeenCalledTimes(1);
    expect(deps.saveReceipt.mock.calls[0]?.[0].transactionId).toBe(TX_ID);
    expect(deps.deleteObject).toHaveBeenCalledWith(previous);
    expect(deps.deleteObject).not.toHaveBeenCalledWith(
      receiptStorageKey(USER_ID, TX_ID, SECOND_ID),
    );
  });

  it('rejects a text file, a file over the limit, and malformed bytes', async () => {
    const notes = fakeDeps();
    await expectStatus(
      storeReceipt(
        notes.deps,
        USER_ID,
        TX_ID,
        imageFile('text/plain', 'notes.txt', Buffer.from('notes')),
      ),
      400,
      RECEIPT_FILE_MESSAGE,
    );
    expect(notes.putObject).not.toHaveBeenCalled();

    const oversized = fakeDeps();
    const tooBig = imageFile('image/png', 'big.png');
    tooBig.size = MAX_RECEIPT_BYTES + 1;
    await expectStatus(
      storeReceipt(oversized.deps, USER_ID, TX_ID, tooBig),
      400,
      RECEIPT_FILE_MESSAGE,
    );
    expect(oversized.putObject).not.toHaveBeenCalled();

    const truncated = fakeDeps();
    const broken = Buffer.from(PNG_BASE64, 'base64').subarray(0, 8);
    await expectStatus(
      storeReceipt(
        truncated.deps,
        USER_ID,
        TX_ID,
        imageFile('image/png', 'cut.png', broken),
      ),
      400,
      RECEIPT_FILE_MESSAGE,
    );
    expect(truncated.putObject).not.toHaveBeenCalled();
    expect(detectReceiptImage(broken)).toBeNull();
  });

  it('reports a missing transaction before it inspects the file', async () => {
    const deps = fakeDeps();
    deps.findTransaction.mockResolvedValue(null);

    await expectStatus(
      storeReceipt(
        deps.deps,
        OTHER_USER_ID,
        TX_ID,
        imageFile('text/plain', 'notes.txt', Buffer.from('notes')),
      ),
      404,
      `Transaction ${TX_ID} not found`,
    );
    expect(deps.findTransaction).toHaveBeenCalledWith(OTHER_USER_ID, TX_ID);
    expect(deps.putObject).not.toHaveBeenCalled();
    expect(deps.saveReceipt).not.toHaveBeenCalled();
  });

  it('leaves the previous photo in place when the receipt row cannot be saved', async () => {
    const deps = fakeDeps();
    const previous = 'receipts/4/9';
    deps.findTransaction.mockResolvedValue({
      receipt: { storageKey: previous },
    });
    deps.saveReceipt.mockRejectedValue(new Error('database'));

    await expectStatus(
      storeReceipt(
        deps.deps,
        USER_ID,
        TX_ID,
        imageFile('image/png', 'slip.png'),
      ),
      500,
      RECEIPT_STORAGE_MESSAGE,
    );
    expect(deps.deleteObject).toHaveBeenCalledTimes(1);
    expect(deps.deleteObject).toHaveBeenCalledWith(
      receiptStorageKey(USER_ID, TX_ID, FIRST_ID),
    );
    expect(deps.deleteObject).not.toHaveBeenCalledWith(previous);
  });

  it('does not write a row when object storage fails', async () => {
    const deps = fakeDeps();
    deps.putObject.mockRejectedValue(new Error('storage'));

    await expectStatus(
      storeReceipt(
        deps.deps,
        USER_ID,
        TX_ID,
        imageFile('image/png', 'slip.png'),
      ),
      500,
      RECEIPT_STORAGE_MESSAGE,
    );
    expect(deps.saveReceipt).not.toHaveBeenCalled();
    expect(deps.deleteObject).not.toHaveBeenCalled();
  });

  it('keeps a successful replacement when deleting the old object fails', async () => {
    const deps = fakeDeps();
    const previous = receiptStorageKey(USER_ID, TX_ID, SECOND_ID);
    deps.findTransaction.mockResolvedValue({
      receipt: { storageKey: previous },
    });
    deps.deleteObject.mockRejectedValue(new Error('storage'));

    const saved = await storeReceipt(
      deps.deps,
      USER_ID,
      TX_ID,
      imageFile('image/png', 'slip.png'),
    );

    expect(saved.transactionId).toBe(TX_ID);
    expect(deps.saveReceipt).toHaveBeenCalledTimes(1);
  });

  it('opens an authorized receipt and rejects a missing or unsafe key', async () => {
    const deps = fakeDeps();
    deps.findTransaction.mockResolvedValue({
      receipt: { storageKey: 'receipts/4/9' },
    });
    deps.signedReadUrl.mockResolvedValue({
      url: 'http://localhost:9000/receipts/receipts/4/9?X-Amz-Expires=900',
      expiresAt: '2026-10-26T12:15:00.000Z',
    });

    await expect(openReceipt(deps.deps, USER_ID, TX_ID)).resolves.toEqual({
      url: 'http://localhost:9000/receipts/receipts/4/9?X-Amz-Expires=900',
      expiresAt: '2026-10-26T12:15:00.000Z',
    });

    const missing = fakeDeps();
    await expectStatus(
      openReceipt(missing.deps, USER_ID, TX_ID),
      404,
      `Receipt for transaction ${TX_ID} not found`,
    );

    const unsafe = fakeDeps();
    unsafe.findTransaction.mockResolvedValue({
      receipt: { storageKey: '../receipts/1/2' },
    });
    await expectStatus(
      openReceipt(unsafe.deps, USER_ID, TX_ID),
      500,
      RECEIPT_OPEN_MESSAGE,
    );
    expect(unsafe.signedReadUrl).not.toHaveBeenCalled();
  });

  it('removes the object before the row, and stops when storage fails', async () => {
    const deps = fakeDeps();
    deps.findTransaction.mockResolvedValue({
      receipt: { storageKey: 'receipts/4/9' },
    });

    await removeReceipt(deps.deps, USER_ID, TX_ID);

    expect(deps.deleteObject).toHaveBeenCalledWith('receipts/4/9');
    expect(deps.deleteReceipt).toHaveBeenCalledWith(TX_ID);
    expect(deps.deleteObject.mock.invocationCallOrder[0]).toBeLessThan(
      deps.deleteReceipt.mock.invocationCallOrder[0] ?? 0,
    );

    const failed = fakeDeps();
    failed.findTransaction.mockResolvedValue({
      receipt: { storageKey: 'receipts/4/9' },
    });
    failed.deleteObject.mockRejectedValue(new Error('storage'));
    await expectStatus(
      removeReceipt(failed.deps, USER_ID, TX_ID),
      500,
      RECEIPT_REMOVE_MESSAGE,
    );
    expect(failed.deleteReceipt).not.toHaveBeenCalled();
  });
});

function imageFile(
  mimetype: string,
  originalname: string,
  bytes = Buffer.from(PNG_BASE64, 'base64'),
): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname,
    encoding: '7bit',
    mimetype,
    size: bytes.length,
    buffer: bytes,
    stream: Readable.from(bytes),
    destination: '',
    filename: '',
    path: '../../secret',
  };
}

function fakeDeps(): {
  deps: ReceiptUploadDeps;
  findTransaction: ReturnType<
    typeof vi.fn<
      (userId: number, id: number) => Promise<OwnedTransaction | null>
    >
  >;
  saveReceipt: ReturnType<typeof vi.fn>;
  deleteReceipt: ReturnType<typeof vi.fn>;
  putObject: ReturnType<typeof vi.fn>;
  deleteObject: ReturnType<typeof vi.fn>;
  signedReadUrl: ReturnType<typeof vi.fn>;
  newObjectId: ReturnType<typeof vi.fn>;
} {
  const findTransaction =
    vi.fn<(userId: number, id: number) => Promise<OwnedTransaction | null>>();
  findTransaction.mockResolvedValue({ receipt: null });
  const saveReceipt = vi.fn();
  saveReceipt.mockImplementation(
    (input: { transactionId: number; contentType: string; byteSize: number }) =>
      Promise.resolve({
        transactionId: input.transactionId,
        contentType: input.contentType,
        byteSize: input.byteSize,
      }),
  );
  const deleteReceipt = vi.fn<() => Promise<void>>();
  deleteReceipt.mockResolvedValue(undefined);
  const putObject = vi.fn<() => Promise<void>>();
  putObject.mockResolvedValue(undefined);
  const deleteObject = vi.fn<() => Promise<void>>();
  deleteObject.mockResolvedValue(undefined);
  const signedReadUrl = vi.fn();
  const newObjectId = vi.fn<() => string>();
  newObjectId.mockReturnValue(FIRST_ID);
  const deps: ReceiptUploadDeps = {
    findTransaction,
    saveReceipt,
    deleteReceipt,
    putObject,
    deleteObject,
    signedReadUrl,
    newObjectId,
  };
  return {
    deps,
    findTransaction,
    saveReceipt,
    deleteReceipt,
    putObject,
    deleteObject,
    signedReadUrl,
    newObjectId,
  };
}

async function expectStatus(
  pending: Promise<unknown>,
  statusCode: number,
  message: string,
): Promise<void> {
  try {
    await pending;
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(HttpException);
    if (
      error instanceof BadRequestException ||
      error instanceof NotFoundException ||
      error instanceof InternalServerErrorException
    ) {
      expect(error.getStatus()).toBe(statusCode);
      expect(messageOf(error)).toBe(message);
      return;
    }
  }
  throw new Error(`expected HTTP ${statusCode}`);
}

function messageOf(error: HttpException): string {
  const body = error.getResponse();
  if (typeof body === 'string') {
    return body;
  }
  if (!('message' in body) || typeof body.message !== 'string') {
    throw new Error('expected a string message');
  }
  return body.message;
}
