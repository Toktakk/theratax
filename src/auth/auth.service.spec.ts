import { readSessionUser } from './auth.service.js';

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
