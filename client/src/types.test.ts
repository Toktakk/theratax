import { describe, expect, it } from 'vitest';
import { asReadyUser } from './types.ts';
import type { User } from './types.ts';

const user: User = {
  id: 4,
  email: 'ada@example.com',
  name: 'Ada',
  practiceType: 'mobile',
  expenseMethod: 'flat_rate',
  onboardedAt: '2026-04-06T12:00:00.000Z',
};

describe('asReadyUser', () => {
  it('requires onboarding, a practice type, and an expense method', () => {
    expect(asReadyUser(user)?.name).toBe('Ada');
    expect(asReadyUser({ ...user, onboardedAt: null })).toBeNull();
    expect(asReadyUser({ ...user, expenseMethod: null })).toBeNull();
    expect(asReadyUser({ ...user, practiceType: null })).toBeNull();
  });
});
