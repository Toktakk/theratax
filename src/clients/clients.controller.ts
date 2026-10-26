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
import { ClientsService } from './clients.service.js';
import type { ClientListResponse, ClientResponse } from './clients.service.js';
import { CreateClientDto } from './dto/create-client.dto.js';
import { ListClientsQueryDto } from './dto/list-clients-query.dto.js';
import { UpdateClientDto } from './dto/update-client.dto.js';

@Controller('clients')
@UseGuards(AuthGuard, OnboardedGuard)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  create(@CurrentUser() user: PublicUser, @Body() body: CreateClientDto): Promise<ClientResponse> {
    return this.clientsService.create(user, body);
  }

  @Get()
  list(
    @CurrentUser() user: PublicUser,
    @Query() query: ListClientsQueryDto,
  ): Promise<ClientListResponse> {
    return this.clientsService.list(user, query);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: PublicUser,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ClientResponse> {
    return this.clientsService.findOne(user, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: PublicUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateClientDto,
  ): Promise<ClientResponse> {
    return this.clientsService.update(user, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: PublicUser, @Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.clientsService.remove(user, id);
  }
}
