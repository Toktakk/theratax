import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service.js';
import type { PublicUser } from './public-user.js';

export interface AuthenticatedRequest extends Request {
  user?: PublicUser;
}

function readBearer(header: string | undefined): string | null {
  if (header === undefined) {
    return null;
  }
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || token === undefined || token.length === 0) {
    return null;
  }
  return token;
}

export async function userFromAuthorization(
  header: string | undefined,
  lookup: (token: string) => Promise<PublicUser | null>,
): Promise<PublicUser> {
  const token = readBearer(header);
  if (token === null) {
    throw new UnauthorizedException('Unauthorized');
  }
  const user = await lookup(token);
  if (user === null) {
    throw new UnauthorizedException('Unauthorized');
  }
  return user;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;
    request.user = await userFromAuthorization(
      typeof header === 'string' ? header : undefined,
      (token) => this.authService.userForToken(token),
    );
    return true;
  }
}