import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest } from './auth.guard.js';
import type { PublicUser } from './public-user.js';

export function requireOnboardedUser(user: PublicUser | undefined): void {
  if (user === undefined) {
    throw new UnauthorizedException('Unauthorized');
  }
  if (user.onboardedAt === null || user.expenseMethod === null) {
    throw new ForbiddenException('Complete onboarding before using this resource');
  }
}

@Injectable()
export class OnboardedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    requireOnboardedUser(request.user);
    return true;
  }
}