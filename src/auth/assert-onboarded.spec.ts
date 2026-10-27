import { ForbiddenException } from '@nestjs/common';
import { assertOnboarded } from './assert-onboarded.js';
import type { PublicUser } from './public-user.js';

function user(overrides: Partial<PublicUser> = {}): PublicUser {
  return {
    id: 4,
    email: 'ada@example.com',
    name: 'Ada',
    practiceType: 'mobile',
    expenseMethod: 'flat_rate',
    onboardedAt: '2026-04-06T00:00:00.000Z',
    ...overrides,
  };
}

describe('assertOnboarded', () => {
  it('accepts a finished profile', () => {
    const ready = user();
    assertOnboarded(ready);
    expect(ready.practiceType).toBe('mobile');
  });

  it('rejects a profile that is missing practice type, expense method, or onboardedAt', () => {
    expect(() => assertOnboarded(user({ practiceType: null }))).toThrow(ForbiddenException);
    expect(() => assertOnboarded(user({ expenseMethod: null }))).toThrow(
      'Complete onboarding before using this resource',
    );
    expect(() => assertOnboarded(user({ onboardedAt: null }))).toThrow(ForbiddenException);
  });
});
