import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateTransactionDto } from './dto/create-transaction.dto.js';

describe('create transaction', () => {
  it('accepts income and an expense with no image', async () => {
    const income = plainToInstance(CreateTransactionDto, {
      type: 'income',
      amountPence: 100,
    });
    const expense = plainToInstance(CreateTransactionDto, {
      type: 'expense',
      amountPence: 250,
      categorySlug: 'other',
    });

    expect(await validate(income)).toEqual([]);
    expect(await validate(expense)).toEqual([]);
    expect(Object.prototype.hasOwnProperty.call(income, 'file')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(expense, 'file')).toBe(false);
  });
});
