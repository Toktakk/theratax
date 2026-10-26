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
  import { OnboardedGuard } from '../auth/onboarded.guard.js';
  import { CurrentUser } from '../auth/current-user.decorator.js';
  import type { PublicUser } from '../auth/public-user.js';
  import { CreateTransactionDto } from './dto/create-transaction.dto.js';
  import { ListTransactionsQueryDto } from './dto/list-transactions-query.dto.js';
  import { UpdateTransactionDto } from './dto/update-transaction.dto.js';
  import { TransactionsService } from './transactions.service.js';
  import type { TransactionListResponse, TransactionResponse } from './transaction-response.js';
  
  @Controller('transactions')
  @UseGuards(AuthGuard, OnboardedGuard)
  export class TransactionsController {
    constructor(private readonly transactionsService: TransactionsService) {}
  
    @Get()
    list(
      @CurrentUser() user: PublicUser,
      @Query() query: ListTransactionsQueryDto,
    ): Promise<TransactionListResponse> {
      return this.transactionsService.list(user, query);
    }
  
    @Post()
    create(
      @CurrentUser() user: PublicUser,
      @Body() body: CreateTransactionDto,
    ): Promise<TransactionResponse> {
      return this.transactionsService.create(user, body);
    }
  
    @Get(':id')
    findOne(
      @CurrentUser() user: PublicUser,
      @Param('id', ParseIntPipe) id: number,
    ): Promise<TransactionResponse> {
      return this.transactionsService.findOne(user, id);
    }
  
    @Patch(':id')
    update(
      @CurrentUser() user: PublicUser,
      @Param('id', ParseIntPipe) id: number,
      @Body() body: UpdateTransactionDto,
    ): Promise<TransactionResponse> {
      return this.transactionsService.update(user, id, body);
    }
  
    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    remove(
      @CurrentUser() user: PublicUser,
      @Param('id', ParseIntPipe) id: number,
    ): Promise<void> {
      return this.transactionsService.remove(user, id);
    }
  }