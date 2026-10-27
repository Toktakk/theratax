import { prismaDouble } from '../../test/prisma-stub.js';
import { EXPENSE_CATEGORIES } from './expense-categories.js';
import { ExpenseCategoriesService } from './expense-categories.service.js';

describe('ExpenseCategoriesService', () => {
  it('returns categories in the seeded order', async () => {
    const { prisma, db } = prismaDouble();
    db.expenseCategory.findMany.mockResolvedValue([...EXPENSE_CATEGORIES].reverse());
    const service = new ExpenseCategoriesService(prisma);

    const categories = await service.list();

    expect(categories.map((category) => category.slug)).toEqual(
      EXPENSE_CATEGORIES.map((category) => category.slug),
    );
    expect(categories).toHaveLength(8);
  });

  it('upserts every seeded category on startup', async () => {
    const { prisma, db } = prismaDouble();
    db.expenseCategory.upsert.mockResolvedValue({});
    const service = new ExpenseCategoriesService(prisma);

    await service.onModuleInit();

    expect(db.expenseCategory.upsert).toHaveBeenCalledTimes(EXPENSE_CATEGORIES.length);
    expect(db.expenseCategory.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: 'oils-consumables' },
      }),
    );
  });
});
