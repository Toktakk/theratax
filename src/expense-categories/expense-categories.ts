export interface ExpenseCategoryResponse {
    slug: string;
    name: string;
    keywords: string[];
    kind: 'general' | 'mileage' | 'vehicle_actual';
  }
  
  export const EXPENSE_CATEGORIES: ExpenseCategoryResponse[] = [
    {
      slug: 'oils-consumables',
      name: 'Oils and consumables',
      kind: 'general',
      keywords: ['oil', 'oils', 'cream', 'wax', 'tape', 'consumable', 'balm'],
    },
    {
      slug: 'hcpc-fees',
      name: 'HCPC registration',
      kind: 'general',
      keywords: ['hcpc', 'registration', 'membership'],
    },
    {
      slug: 'professional-insurance',
      name: 'Professional insurance',
      kind: 'general',
      keywords: ['indemnity', 'insurance'],
    },
    {
      slug: 'laundry',
      name: 'Laundry',
      kind: 'general',
      keywords: ['laundry', 'towel', 'linen', 'washing'],
    },
    {
      slug: 'mileage',
      name: 'Mileage',
      kind: 'mileage',
      keywords: ['mileage', 'miles', 'petrol', 'fuel', 'travel'],
    },
    {
      slug: 'vehicle-costs',
      name: 'Vehicle costs',
      kind: 'vehicle_actual',
      keywords: ['fuel', 'petrol', 'mot', 'service', 'repair', 'servicing'],
    },
    {
      slug: 'other',
      name: 'Other',
      kind: 'general',
      keywords: [],
    },
  ];