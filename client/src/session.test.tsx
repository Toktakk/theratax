import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from './App.tsx';
import { getToken, request, signIn } from './api.ts';
import { OnboardingPage } from './pages/OnboardingPage.tsx';
import { RegisterPage } from './pages/RegisterPage.tsx';
import { SignInPage } from './pages/SignInPage.tsx';
import type { User } from './types.ts';

vi.mock('./api.ts', async () => {
  const actual = await vi.importActual<typeof import('./api.ts')>('./api.ts');
  return {
    ...actual,
    getToken: vi.fn(() => null),
    clearToken: vi.fn(),
    onSignedOut: vi.fn(() => () => undefined),
    request: vi.fn(),
    signIn: vi.fn(),
  };
});

const ready: User = {
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

describe('session', () => {
  beforeEach(() => {
    vi.mocked(getToken).mockReturnValue(null);
    vi.mocked(request).mockReset();
    vi.mocked(signIn).mockReset();
  });

  it('shows the sign-in page when there is no token', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'Log in' })).toBeInTheDocument();
  });

  it('shows onboarding when the profile is unfinished', async () => {
    vi.mocked(getToken).mockReturnValue('token');
    vi.mocked(request).mockResolvedValue({ ...ready, practiceType: null, expenseMethod: null, onboardedAt: null });
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    expect(await screen.findByRole('heading', { name: 'Set up your practice' })).toBeInTheDocument();
  });

  it('shows the feed and navigation when the session is ready', async () => {
    vi.mocked(getToken).mockReturnValue('token');
    vi.mocked(request).mockImplementation(async (path: string) => {
      if (path === '/users/me') {
        return ready;
      }
      if (path === '/expense-categories') {
        return [];
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
      return { items: [], total: 0, skip: 0, limit: 100 };
    });
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    expect(await screen.findByRole('heading', { name: 'Log' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Workplaces' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Invoices' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tax summary' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Profile' })).toBeInTheDocument();
  });

  it('submits the sign-in form', async () => {
    const user = userEvent.setup();
    const onSignedIn = vi.fn();
    vi.mocked(signIn).mockResolvedValue(ready);
    render(
      <MemoryRouter>
        <SignInPage onSignedIn={onSignedIn} />
      </MemoryRouter>,
    );
    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText('Password'), 'password1');
    await user.click(screen.getByRole('button', { name: 'Log in' }));
    expect(signIn).toHaveBeenCalledWith('/auth/login', {
      email: 'ada@example.com',
      password: 'password1',
    });
    expect(onSignedIn).toHaveBeenCalledWith(ready);
  });

  it('submits the register form', async () => {
    const user = userEvent.setup();
    const onSignedIn = vi.fn();
    vi.mocked(signIn).mockResolvedValue(ready);
    render(
      <MemoryRouter>
        <RegisterPage onSignedIn={onSignedIn} />
      </MemoryRouter>,
    );
    await user.type(screen.getByLabelText('Name'), 'Ada');
    await user.type(screen.getByLabelText('Email'), 'ada@example.com');
    await user.type(screen.getByLabelText('Password'), 'password1');
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    expect(signIn).toHaveBeenCalledWith('/auth/register', {
      email: 'ada@example.com',
      password: 'password1',
      name: 'Ada',
    });
    expect(onSignedIn).toHaveBeenCalledWith(ready);
  });

  it('submits onboarding with a practice, a vehicle method, and an address', async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    vi.mocked(request).mockResolvedValue(ready);
    render(
      <OnboardingPage
        user={{ ...ready, practiceType: null, expenseMethod: null, onboardedAt: null }}
        onComplete={onComplete}
        onLogout={() => undefined}
      />,
    );
    await user.click(screen.getByRole('radio', { name: 'Travels to the client' }));
    await user.click(screen.getByRole('radio', { name: 'Single-rate mileage' }));
    await user.type(screen.getByLabelText('Address line 1'), '1 High Street');
    await user.type(screen.getByLabelText('Town'), 'London');
    await user.type(screen.getByLabelText('Postcode'), 'SW1A 1AA');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(request).toHaveBeenNthCalledWith(
      1,
      '/users/me/address',
      expect.objectContaining({
        method: 'PATCH',
        json: { addressLine1: '1 High Street', town: 'London', postcode: 'SW1A 1AA' },
      }),
    );
    expect(request).toHaveBeenNthCalledWith(
      2,
      '/users/me/onboarding',
      expect.objectContaining({
        method: 'PATCH',
        json: { practiceType: 'mobile', expenseMethod: 'flat_rate' },
      }),
    );
    expect(onComplete).toHaveBeenCalledWith(ready);
  });
});
