import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService, readSessionUser } from './auth.service.js';
import { prismaDouble } from '../../test/prisma-stub.js';

const { hash, compare } = vi.hoisted(() => ({
  hash: vi.fn(),
  compare: vi.fn(),
}));

vi.mock('bcrypt', () => ({
  default: { hash, compare },
}));

const stored = {
  id: 4,
  email: 'ada@example.com',
  name: 'Ada',
  passwordHash: 'secret-hash',
  practiceType: 'mobile' as const,
  expenseMethod: 'flat_rate' as const,
  onboardedAt: new Date('2026-04-06T12:00:00.000Z'),
  addressLine1: null,
  addressLine2: null,
  town: null,
  postcode: null,
};

describe('session user', () => {
  const now = Date.parse('2026-04-10T00:00:00.000Z');

  it('returns the public user for a session that has not expired', () => {
    const user = readSessionUser(
      {
        expiresAt: new Date('2026-04-11T00:00:00.000Z'),
        user: stored,
      },
      now,
    );
    expect(user).toEqual({
      id: 4,
      email: 'ada@example.com',
      name: 'Ada',
      practiceType: 'mobile',
      expenseMethod: 'flat_rate',
      onboardedAt: '2026-04-06T12:00:00.000Z',
    });
    expect(user).not.toHaveProperty('passwordHash');
  });

  it('returns null for a missing or expired session', () => {
    expect(readSessionUser(null, now)).toBeNull();
    expect(
      readSessionUser(
        {
          expiresAt: new Date('2026-04-10T00:00:00.000Z'),
          user: stored,
        },
        now,
      ),
    ).toBeNull();
  });
});

function account(overrides: Partial<typeof stored> = {}) {
  return { ...stored, ...overrides };
}

describe('AuthService', () => {
  beforeEach(() => {
    hash.mockReset();
    compare.mockReset();
    hash.mockResolvedValue('hashed-password');
    compare.mockResolvedValue(false);
  });

  it('registers a new user and omits the password hash', async () => {
    const { prisma, db } = prismaDouble();
    db.user.findUnique.mockResolvedValue(null);
    db.user.create.mockResolvedValue(
      account({ passwordHash: 'hashed-password', practiceType: null, expenseMethod: null, onboardedAt: null }),
    );
    db.session.create.mockResolvedValue({});
    const service = new AuthService(prisma);

    const result = await service.register({
      email: 'ada@example.com',
      name: 'Ada',
      password: 'secret-pass',
    });

    expect(hash).toHaveBeenCalledWith('secret-pass', 10);
    expect(result.accessToken.length).toBeGreaterThan(0);
    expect(result.user).not.toHaveProperty('passwordHash');
    expect(result.user.email).toBe('ada@example.com');
    expect(db.session.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        token: result.accessToken,
        userId: 4,
      }),
    });
  });

  it('rejects a duplicate email', async () => {
    const { prisma, db } = prismaDouble();
    db.user.findUnique.mockResolvedValue(account());
    const service = new AuthService(prisma);

    await expect(
      service.register({ email: 'ada@example.com', name: 'Ada', password: 'secret-pass' }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(db.user.create).not.toHaveBeenCalled();
  });

  it('rejects a wrong password and signs in a matching one', async () => {
    const { prisma, db } = prismaDouble();
    db.user.findUnique.mockResolvedValue(account());
    db.session.create.mockResolvedValue({});
    const service = new AuthService(prisma);

    await expect(
      service.login({ email: 'ada@example.com', password: 'wrong' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    compare.mockResolvedValue(true);
    const result = await service.login({ email: 'ada@example.com', password: 'secret' });
    expect(result.user).not.toHaveProperty('passwordHash');
    expect(result.accessToken.length).toBeGreaterThan(0);
  });

  it('loads the public user for a live token', async () => {
    const { prisma, db } = prismaDouble();
    db.session.findUnique.mockResolvedValue({
      expiresAt: new Date(Date.now() + 60_000),
      user: account(),
    });
    const service = new AuthService(prisma);

    const user = await service.userForToken('token-1');
    expect(user?.id).toBe(4);
    expect(user).not.toHaveProperty('passwordHash');
    expect(db.session.findUnique).toHaveBeenCalledWith({
      where: { token: 'token-1' },
      include: { user: true },
    });
  });

  it('refuses a second onboarding', async () => {
    const { prisma, db } = prismaDouble();
    db.user.updateMany.mockResolvedValue({ count: 0 });
    const service = new AuthService(prisma);

    await expect(
      service.completeOnboarding(4, { practiceType: 'mobile', expenseMethod: 'flat_rate' }),
    ).rejects.toThrow('Onboarding already completed');
  });

  it('stores a business address and can replace it', async () => {
    const { prisma, db } = prismaDouble();
    db.user.update.mockResolvedValue(
      account({
        addressLine1: '4 Spa Lane',
        addressLine2: null,
        town: 'Leeds',
        postcode: 'LS1 4AP',
      }),
    );
    const service = new AuthService(prisma);
    const input = {
      addressLine1: '4 Spa Lane',
      town: 'Leeds',
      postcode: 'ls14ap',
    };

    const first = await service.setAddress(4, input);
    const second = await service.setAddress(4, input);

    expect(first.postcode).toBe('LS1 4AP');
    expect(second.postcode).toBe('LS1 4AP');
    expect(db.user.update).toHaveBeenCalledTimes(2);
  });
});
