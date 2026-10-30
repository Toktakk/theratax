import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcrypt';
import { publicAddress, readPostalAddress, storedAddress } from '../postal-address/postal-address.js';
import type { PostalAddressDto } from '../postal-address/postal-address.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { OnboardingDto } from './dto/onboarding.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RegisterDto } from './dto/register.dto.js';
import { normalizeEmail } from './normalize-email.js';
import type { AuthResponse, PublicUser } from './public-user.js';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

interface UserRow {
  id: number;
  email: string;
  name: string;
  passwordHash: string;
  practiceType: PublicUser['practiceType'];
  expenseMethod: PublicUser['expenseMethod'];
  onboardedAt: Date | null;
  addressLine1: string | null;
  addressLine2: string | null;
  town: string | null;
  postcode: string | null;
}

export function readSessionUser(
  session: { expiresAt: Date; user: UserRow } | null,
  nowMs: number,
): PublicUser | null {
  if (session === null || session.expiresAt.getTime() <= nowMs) {
    return null;
  }
  return toPublicUser(session.user);
}

function toPublicUser(user: UserRow): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    practiceType: user.practiceType,
    expenseMethod: user.expenseMethod,
    onboardedAt: user.onboardedAt === null ? null : user.onboardedAt.toISOString(),
    ...publicAddress(storedAddress(user)),
  };
}

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async register(input: RegisterDto): Promise<AuthResponse> {
    const email = normalizeEmail(input.email);
    const existing = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existing !== null) {
      throw new ConflictException('Email already registered');
    }
    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email,
        name: input.name,
        passwordHash,
      },
    });
    const accessToken = await this.createSession(user.id);
    return { accessToken, user: toPublicUser(user) };
  }

  async login(input: LoginDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: normalizeEmail(input.email) },
    });
    const matches =
      user !== null && (await bcrypt.compare(input.password, user.passwordHash));
    if (user === null || !matches) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const accessToken = await this.createSession(user.id);
    return { accessToken, user: toPublicUser(user) };
  }

  async userForToken(token: string): Promise<PublicUser | null> {
    const session = await this.prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });
    return readSessionUser(session, Date.now());
  }

  async completeOnboarding(userId: number, input: OnboardingDto): Promise<PublicUser> {
    const updated = await this.prisma.user.updateMany({
      where: { id: userId, onboardedAt: null },
      data: {
        practiceType: input.practiceType,
        expenseMethod: input.expenseMethod,
        onboardedAt: new Date(),
      },
    });
    if (updated.count === 0) {
      throw new ConflictException('Onboarding already completed');
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user === null) {
      throw new UnauthorizedException();
    }
    return toPublicUser(user);
  }

  async setAddress(userId: number, input: PostalAddressDto): Promise<PublicUser> {
    const address = readPostalAddress(input);
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2 ?? null,
        town: address.town,
        postcode: address.postcode,
      },
    });
    return toPublicUser(user);
  }

  async revokeSession(token: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { token } });
  }

  private async createSession(userId: number): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    await this.prisma.session.create({
      data: {
        token,
        userId,
        expiresAt: new Date(Date.now() + SEVEN_DAYS_MS),
      },
    });
    return token;
  }
}