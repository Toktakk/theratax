import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { requireOnboardedUser } from './onboarded.guard.js';
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

describe('onboarding guard', () => {
  it('rejects a request that has no user', () => {
    expect(() => requireOnboardedUser(undefined)).toThrow(UnauthorizedException);
  });

  it('rejects a user who has not finished onboarding', () => {
    expect(() => requireOnboardedUser(user({ onboardedAt: null }))).toThrow(
      'Complete onboarding before using this resource',
    );
    expect(() => requireOnboardedUser(user({ expenseMethod: null }))).toThrow(ForbiddenException);
  });

  it('allows a user whose practice type is still empty when expense method and onboardedAt are set', () => {
    expect(() => requireOnboardedUser(user({ practiceType: null }))).not.toThrow();
  });
});
