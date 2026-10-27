import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { request } from './api.ts';
import { DirectoryPage } from './pages/DirectoryPage.tsx';
import { FeedPage } from './pages/FeedPage.tsx';
import { InvoicePage } from './pages/InvoicePage.tsx';
import { ProfilePage } from './pages/ProfilePage.tsx';
import { TaxSummaryPage } from './pages/TaxSummaryPage.tsx';
import type { ReadyUser } from './types.ts';

vi.mock('./api.ts', async () => {
  const actual = await vi.importActual<typeof import('./api.ts')>('./api.ts');
  return {
    ...actual,
    getToken: vi.fn(() => 'token'),
    clearToken: vi.fn(),
    onSignedOut: vi.fn(() => () => undefined),
    request: vi.fn(),
    downloadFile: vi.fn(),
  };
});

const user: ReadyUser = {
  id: 4,
  email: 'ada@example.com',
  name: 'Ada',
  practiceType: 'mobile',
  expenseMethod: 'flat_rate',
  onboardedAt: '2026-04-06T12:00:00.000Z',
  addressLine1: '1 High Street',
  town: 'London',
  postcode: 'SW1A 1AA',
};

const emptyPage = { items: [], total: 0, skip: 0, limit: 100 };

const workplace = {
  id: 3,
  name: 'North Spa',
  kind: 'spa' as const,
  hourRatePence: 2500,
  hourExtras: [],
  addressLine1: '4 Spa Lane',
  town: 'Leeds',
  postcode: 'LS1 4AP',
  createdAt: '2026-05-01T10:00:00.000Z',
  updatedAt: '2026-05-01T10:00:00.000Z',
};

describe('records', () => {
  beforeEach(() => {
    vi.mocked(request).mockReset();
  });

  it('shows a loaded feed entry and saves cash income', async () => {
    const actor = userEvent.setup();
    vi.mocked(request).mockImplementation(async (path: string, options?: { method?: string; json?: unknown }) => {
      if (options?.method === 'POST' && path === '/transactions') {
        return {
          id: 9,
          type: 'income',
          occurredOn: '01-05-2026',
          amountPence: 1000,
          hasReceipt: false,
        };
      }
      if (path === '/expense-categories') {
        return [];
      }
      if (path.startsWith('/transactions')) {
        return {
          items: [
            {
              id: 8,
              type: 'income',
              occurredOn: '01-05-2026',
              amountPence: 1200,
              hasReceipt: false,
              note: 'Morning session',
            },
          ],
          total: 1,
          skip: 0,
          limit: 100,
        };
      }
      if (path.startsWith('/income/summary')) {
        return {
          date: '27-10-2026',
          basePence: 0,
          additionalFeePence: 0,
          bonusPence: 0,
          totalPence: 0,
          byWorkplace: [],
          byMassageType: [],
        };
      }
      return emptyPage;
    });

    render(
      <MemoryRouter>
        <FeedPage user={user} />
      </MemoryRouter>,
    );
    expect(await screen.findByText('Morning session')).toBeInTheDocument();
    await actor.selectOptions(screen.getByLabelText('Massage Type'), 'cash');
    await actor.type(screen.getByLabelText('Pounds'), '10');
    await actor.click(screen.getByRole('button', { name: 'Save' }));
    expect(request).toHaveBeenCalledWith('/transactions', {
      method: 'POST',
      json: { type: 'income', amountPence: 1000 },
    });
  });

  it('lists a saved workplace', async () => {
    vi.mocked(request).mockImplementation(async (path: string) => {
      if (path.startsWith('/workplaces')) {
        return { items: [workplace], total: 1, skip: 0, limit: 100 };
      }
      return emptyPage;
    });
    render(
      <MemoryRouter>
        <DirectoryPage />
      </MemoryRouter>,
    );
    expect(await screen.findByText(/North Spa/)).toBeInTheDocument();
  });

  it('shows an invoice preview total', async () => {
    const actor = userEvent.setup();
    vi.mocked(request).mockImplementation(async (path: string) => {
      if (path.startsWith('/invoices/preview')) {
        return {
          recipientKind: 'spa',
          recipientName: 'North Spa',
          workplaceId: 3,
          period: 'day',
          periodStart: '01-05-2026',
          periodEnd: '01-05-2026',
          amountPence: 6700,
          lines: [
            {
              kind: 'service',
              description: 'Swedish',
              quantity: 1,
              quantityUnit: 'session',
              ratePence: 6000,
              amountPence: 6000,
              occurredOn: '01-05-2026',
            },
          ],
        };
      }
      if (path.startsWith('/workplaces')) {
        return { items: [workplace], total: 1, skip: 0, limit: 100 };
      }
      return emptyPage;
    });
    render(
      <MemoryRouter>
        <InvoicePage user={user} onUserUpdated={() => undefined} />
      </MemoryRouter>,
    );
    await actor.click(await screen.findByRole('radio', { name: 'Spa' }));
    await actor.selectOptions(screen.getByRole('combobox', { name: 'Spa' }), '3');
    await actor.click(screen.getByRole('radio', { name: 'Daily' }));
    await actor.type(screen.getByLabelText('Date'), '2026-05-01');
    expect(await screen.findByText('Total £67.00')).toBeInTheDocument();
  });

  it('shows tax figures from the summary', async () => {
    vi.mocked(request).mockResolvedValue({
      taxYear: '2026-27',
      periodStart: '06-04-2026',
      periodEnd: '05-04-2027',
      expenseMethod: 'flat_rate',
      incomePence: 2_000_000,
      allowableExpensesPence: 0,
      netProfitPence: 2_000_000,
      taxableProfitPence: 2_000_000,
      incomeTaxPence: 148_600,
      class4NationalInsurancePence: 44_580,
      estimatedTaxOwedPence: 193_180,
      class2: { treatedAsPaid: true, voluntaryWeeklyPence: 365 },
      assumptions: ['Rates are for England, Wales, and Northern Ireland for 2026–27. Scottish Income Tax is not applied.'],
      disclaimer: 'TheraTax produces estimated tax figures for planning purposes only and is not a substitute for formal accounting or tax advice.',
    });
    render(
      <MemoryRouter>
        <TaxSummaryPage />
      </MemoryRouter>,
    );
    expect(await screen.findByText('£1931.80')).toBeInTheDocument();
    expect(screen.getAllByText('£20000.00')).toHaveLength(2);
  });

  it('saves a business address from the profile', async () => {
    const actor = userEvent.setup();
    vi.mocked(request).mockResolvedValue({
      ...user,
      addressLine1: '5 Spa Lane',
    });
    render(
      <MemoryRouter>
        <ProfilePage user={user} onUserUpdated={() => undefined} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Ada')).toBeInTheDocument();
    const line = screen.getByLabelText('Address line 1');
    await actor.clear(line);
    await actor.type(line, '5 Spa Lane');
    await actor.click(screen.getByRole('button', { name: 'Save address' }));
    expect(request).toHaveBeenCalledWith('/users/me/address', {
      method: 'PATCH',
      json: {
        addressLine1: '5 Spa Lane',
        town: 'London',
        postcode: 'SW1A 1AA',
      },
    });
    expect(await screen.findByText('Address saved.')).toBeInTheDocument();
  });
});
