import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { OnboardedGuard } from '../auth/onboarded.guard.js';
import type { PublicUser } from '../auth/public-user.js';
import { CreateWorkplaceDto } from './dto/create-workplace.dto.js';
import { ListWorkplacesQueryDto } from './dto/list-workplaces-query.dto.js';
import { WorkplacesService } from './workplaces.service.js';
import type { WorkplaceListResponse, WorkplaceResponse } from './workplaces.service.js';

@Controller('workplaces')
@UseGuards(AuthGuard, OnboardedGuard)
export class WorkplacesController {
  constructor(private readonly workplacesService: WorkplacesService) {}

  @Post()
  create(
    @CurrentUser() user: PublicUser,
    @Body() body: CreateWorkplaceDto,
  ): Promise<WorkplaceResponse> {
    return this.workplacesService.create(user, body);
  }

  @Get()
  list(
    @CurrentUser() user: PublicUser,
    @Query() query: ListWorkplacesQueryDto,
  ): Promise<WorkplaceListResponse> {
    return this.workplacesService.list(user, query);
  }
}
