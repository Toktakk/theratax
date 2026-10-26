import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { OnboardedGuard } from '../auth/onboarded.guard.js';
import type { PublicUser } from '../auth/public-user.js';
import { CreateHourlyBonusDto } from './dto/create-hourly-bonus.dto.js';
import { ListHourlyBonusesQueryDto } from './dto/list-hourly-bonuses-query.dto.js';
import { UpdateHourlyBonusDto } from './dto/update-hourly-bonus.dto.js';
import { HourlyBonusesService } from './hourly-bonuses.service.js';
import type { HourlyBonusListResponse, HourlyBonusResponse } from './hourly-bonuses.service.js';

@Controller('hourly-bonuses')
@UseGuards(AuthGuard, OnboardedGuard)
export class HourlyBonusesController {
  constructor(private readonly hourlyBonusesService: HourlyBonusesService) {}

  @Post()
  create(
    @CurrentUser() user: PublicUser,
    @Body() body: CreateHourlyBonusDto,
  ): Promise<HourlyBonusResponse> {
    return this.hourlyBonusesService.create(user, body);
  }

  @Get()
  list(
    @CurrentUser() user: PublicUser,
    @Query() query: ListHourlyBonusesQueryDto,
  ): Promise<HourlyBonusListResponse> {
    return this.hourlyBonusesService.list(user, query);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: PublicUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<HourlyBonusResponse> {
    return this.hourlyBonusesService.findOne(user, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: PublicUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateHourlyBonusDto,
  ): Promise<HourlyBonusResponse> {
    return this.hourlyBonusesService.update(user, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUser() user: PublicUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<void> {
    return this.hourlyBonusesService.remove(user, id);
  }
}
