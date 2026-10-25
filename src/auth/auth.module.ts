import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthGuard } from './auth.guard.js';
import { AuthService } from './auth.service.js';
import { UsersController } from './users.controller.js';

@Module({
  controllers: [AuthController, UsersController],
  providers: [AuthService, AuthGuard],
  exports: [AuthService],
})
export class AuthModule {}