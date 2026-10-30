import { vi } from 'vitest';
import type { PrismaService } from '../src/prisma/prisma.service.js';

type Fn = ReturnType<typeof vi.fn>;

export interface PrismaDouble {
  user: {
    findUnique: Fn;
    create: Fn;
    update: Fn;
    updateMany: Fn;
  };
  session: {
    findUnique: Fn;
    create: Fn;
    deleteMany: Fn;
  };
  workplace: {
    create: Fn;
    findMany: Fn;
    findFirst: Fn;
    count: Fn;
    update: Fn;
  };
  client: {
    create: Fn;
    findMany: Fn;
    findFirst: Fn;
    count: Fn;
    update: Fn;
    delete: Fn;
  };
  transaction: {
    findMany: Fn;
    findFirst: Fn;
    count: Fn;
    create: Fn;
    update: Fn;
    delete: Fn;
    aggregate: Fn;
  };
  invoice: {
    findMany: Fn;
    findFirst: Fn;
    count: Fn;
    create: Fn;
    update: Fn;
  };
  invoiceLine: {
    aggregate: Fn;
  };
  expenseCategory: {
    upsert: Fn;
    findMany: Fn;
    findUnique: Fn;
  };
  receipt: {
    upsert: Fn;
    delete: Fn;
  };
  $transaction: Fn;
}

type TxCallback = (tx: PrismaDouble) => unknown;

function isCallback(value: unknown): value is TxCallback {
  return typeof value === 'function';
}

export function asDependency<T>(value: object): T {
  return value as unknown as T;
}

export function prismaDouble(): { prisma: PrismaService; db: PrismaDouble } {
  const db: PrismaDouble = {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    session: {
      findUnique: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    workplace: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    client: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    transaction: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      aggregate: vi.fn(),
    },
    invoice: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    invoiceLine: {
      aggregate: vi.fn(),
    },
    expenseCategory: {
      upsert: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    receipt: {
      upsert: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  db.$transaction.mockImplementation((arg: unknown) => {
    if (!isCallback(arg)) {
      throw new Error('$transaction expected a callback');
    }
    return arg(db);
  });
  return { prisma: asDependency<PrismaService>(db), db };
}
