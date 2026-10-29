import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { clearToken, getToken, onSignedOut, request } from './api.ts';
import { DirectoryPage } from './pages/DirectoryPage.tsx';
import { FeedPage } from './pages/FeedPage.tsx';
import { InvoicePage } from './pages/InvoicePage.tsx';
import { OnboardingPage } from './pages/OnboardingPage.tsx';
import { ProfilePage } from './pages/ProfilePage.tsx';
import { RegisterPage } from './pages/RegisterPage.tsx';
import { SignInPage } from './pages/SignInPage.tsx';
import { TaxSummaryPage } from './pages/TaxSummaryPage.tsx';
import { asReadyUser } from './types.ts';
import type { ReadyUser, User } from './types.ts';

type Session =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'onboarding'; user: User }
  | { status: 'ready'; user: ReadyUser };

function sessionFromUser(user: User): Session {
  const ready = asReadyUser(user);
  if (ready === null) {
    return { status: 'onboarding', user };
  }
  return { status: 'ready', user: ready };
}

export default function App() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session>(() =>
    getToken() === null ? { status: 'signed-out' } : { status: 'loading' },
  );

  useEffect(() => {
    return onSignedOut(() => {
      setSession({ status: 'signed-out' });
    });
  }, []);

  useEffect(() => {
    if (getToken() === null) {
      return;
    }
    let cancelled = false;
    request<User>('/users/me')
      .then((user) => {
        if (!cancelled) {
          setSession(sessionFromUser(user));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSession({ status: 'signed-out' });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function logout() {
    clearToken();
    setSession({ status: 'signed-out' });
    navigate('/');
  }

  function onSignedIn(user: User) {
    setSession(sessionFromUser(user));
  }

  if (session.status === 'loading') {
    return (
      <div className="page">
        <p className="muted">Checking your session…</p>
      </div>
    );
  }

  if (session.status === 'signed-out') {
    return (
      <Routes>
        <Route path="/" element={<SignInPage onSignedIn={onSignedIn} />} />
        <Route path="/register" element={<RegisterPage onSignedIn={onSignedIn} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  if (session.status === 'onboarding') {
    return (
      <OnboardingPage
        user={session.user}
        onLogout={logout}
        onComplete={(user) => {
          setSession(sessionFromUser(user));
          navigate('/');
        }}
      />
    );
  }

  return (
    <div className="shell">
      <Shell user={session.user} onLogout={logout}>
        <Routes>
          <Route path="/" element={<FeedPage user={session.user} />} />
          <Route path="/workplaces" element={<DirectoryPage />} />
          <Route
            path="/invoices"
            element={
              <InvoicePage
                user={session.user}
                onUserUpdated={(user) => {
                  const ready = asReadyUser(user);
                  if (ready !== null) {
                    setSession({ status: 'ready', user: ready });
                  }
                }}
              />
            }
          />
          <Route path="/tax" element={<TaxSummaryPage />} />
          <Route
            path="/profile"
            element={
              <ProfilePage
                user={session.user}
                onUserUpdated={(user) => {
                  const ready = asReadyUser(user);
                  if (ready !== null) {
                    setSession({ status: 'ready', user: ready });
                  }
                }}
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Shell>
    </div>
  );
}

function Shell({
  user,
  onLogout,
  children,
}: {
  user: ReadyUser;
  onLogout: () => void;
  children: ReactNode;
}) {
  return (
    <>
      <div className="side">
        <div>
          <h1 className="brand">TheraTax</h1>
          <p className="who">{user.name}</p>
        </div>
        <nav className="nav" aria-label="Primary">
          <NavItem to="/" end label="Log" />
          <NavItem to="/workplaces" label="Workplaces" short="Places" />
          <NavItem to="/invoices" label="Invoices" />
          <NavItem to="/tax" label="Tax summary" short="Tax" />
        </nav>
        <div className="account">
          <NavLink to="/profile" className={navClass}>
            Profile
          </NavLink>
          <button className="button-ghost" type="button" onClick={onLogout}>
            Log out
          </button>
        </div>
      </div>
      <main className="shell-main">{children}</main>
    </>
  );
}

function NavItem({
  to,
  end,
  label,
  short,
}: {
  to: string;
  end?: boolean;
  label: string;
  short?: string;
}) {
  return (
    <NavLink to={to} end={end} className={navClass}>
      <span className="nav-full">{label}</span>
      <span className="nav-short" aria-hidden="true">
        {short ?? label}
      </span>
    </NavLink>
  );
}

function navClass({ isActive }: { isActive: boolean }): string {
  return isActive ? 'nav-link active' : 'nav-link';
}
