import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  EXPENSE_CATEGORIES,
  type ExpenseCategoryResponse,
} from './expense-categories.js';

@Injectable()
export class ExpenseCategoriesService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    for (const category of EXPENSE_CATEGORIES) {
      await this.prisma.expenseCategory.upsert({
        where: { slug: category.slug },
        update: {
          name: category.name,
          kind: category.kind,
          keywords: category.keywords,
        },
        create: category,
      });
    }
  }

  async list(): Promise<ExpenseCategoryResponse[]> {
    const rows = await this.prisma.expenseCategory.findMany();
    const bySlug = new Map(rows.map((row) => [row.slug, row]));
    const categories: ExpenseCategoryResponse[] = [];
    for (const category of EXPENSE_CATEGORIES) {
      const row = bySlug.get(category.slug);
      if (row !== undefined) {
        categories.push({
          slug: row.slug,
          name: row.name,
          keywords: row.keywords,
          kind: row.kind,
        });
      }
    }
    return categories;
  }
}