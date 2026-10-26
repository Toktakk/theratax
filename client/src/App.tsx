import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { NavLink, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { clearToken, getToken, onSignedOut, request } from './api.ts';
import { FeedPage } from './pages/FeedPage.tsx';
import { InvoicePage } from './pages/InvoicePage.tsx';
import { OnboardingPage } from './pages/OnboardingPage.tsx';
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

  if (session.status === 'loading') {
    return (
      <div className="page">
        <p className="muted">Checking your session…</p>
      </div>
    );
  }

  if (session.status === 'signed-out') {
    return (
      <SignInPage
        onSignedIn={(user) => {
          setSession(sessionFromUser(user));
        }}
      />
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
    <div className="page">
      <Shell user={session.user} onLogout={logout}>
        <Routes>
          <Route path="/" element={<FeedPage user={session.user} />} />
          <Route path="/invoices" element={<InvoicePage />} />
          <Route path="/tax" element={<TaxSummaryPage />} />
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
      <header className="top">
        <div>
          <h1 className="brand">TheraTax</h1>
          <p className="who">{user.name}</p>
        </div>
        <nav className="nav">
          <NavLink to="/" end className={navClass}>
            Feed
          </NavLink>
          <NavLink to="/invoices" className={navClass}>
            Invoices
          </NavLink>
          <NavLink to="/tax" className={navClass}>
            Tax summary
          </NavLink>
        </nav>
        <button className="button-ghost" type="button" onClick={onLogout}>
          Log out
        </button>
      </header>
      <main>{children}</main>
    </>
  );
}

function navClass({ isActive }: { isActive: boolean }): string {
  return isActive ? 'nav-link active' : 'nav-link';
}
