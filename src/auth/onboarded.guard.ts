import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { AuthenticatedRequest } from './auth.guard.js';

@Injectable()
export class OnboardedGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (request.user === undefined) {
      throw new UnauthorizedException('Unauthorized');
    }
    if (request.user.onboardedAt === null || request.user.expenseMethod === null) {
      throw new ForbiddenException('Complete onboarding before using this resource');
    }
    return true;
  }
}