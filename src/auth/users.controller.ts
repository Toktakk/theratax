import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import { CurrentUser } from './current-user.decorator.js';
import { OnboardingDto } from './dto/onboarding.dto.js';
import type { PublicUser } from './public-user.js';

@Controller('users')
@UseGuards(AuthGuard)
export class UsersController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  me(@CurrentUser() user: PublicUser): PublicUser {
    return user;
  }

  @Patch('me/onboarding')
  onboard(
    @CurrentUser() user: PublicUser,
    @Body() body: OnboardingDto,
  ): Promise<PublicUser> {
    return this.authService.completeOnboarding(user.id, body);
  }
}