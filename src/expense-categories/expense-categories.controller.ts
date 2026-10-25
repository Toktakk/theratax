import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard.js';
import { ExpenseCategoriesService } from './expense-categories.service.js';
import type { ExpenseCategoryResponse } from './expense-categories.js';

@Controller('expense-categories')
@UseGuards(AuthGuard)
export class ExpenseCategoriesController {
  constructor(private readonly expenseCategoriesService: ExpenseCategoriesService) {}

  @Get()
  list(): Promise<ExpenseCategoryResponse[]> {
    return this.expenseCategoriesService.list();
  }
}