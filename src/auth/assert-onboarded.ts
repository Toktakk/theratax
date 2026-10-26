import { ForbiddenException } from '@nestjs/common';
import type { PublicUser } from './public-user.js';

type OnboardedUser = PublicUser & {
  practiceType: 'mobile' | 'fixedLocation' | 'mixed';
  expenseMethod: 'flat_rate' | 'actual_cost';
  onboardedAt: string;
};

export function assertOnboarded(user: PublicUser): asserts user is OnboardedUser {
  if (
    user.onboardedAt === null ||
    user.practiceType === null ||
    user.expenseMethod === null
  ) {
    throw new ForbiddenException('Complete onboarding before using this resource');
  }
}
