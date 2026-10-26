import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { messageOf, signIn } from '../api.ts';
import { FormError } from '../FormError.tsx';
import type { User } from '../types.ts';

interface SignInPageProps {
  onSignedIn: (user: User) => void;
}

export function SignInPage({ onSignedIn }: SignInPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function onLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setPending(true);
    try {
      const user = await signIn('/auth/login', {
        email: email.trim(),
        password,
      });
      onSignedIn(user);
    } catch (caught: unknown) {
      setError(messageOf(caught));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="page auth">
      <header className="top">
        <h1 className="brand">TheraTax</h1>
      </header>
      <p className="lede">Sign in to log sessions, receipts, and invoices.</p>
      <form className="card stack" onSubmit={onLogin}>
        <h2>Log in</h2>
        <label className="field">
          Email
          <input
            id="login-email"
            type="email"
            value={email}
            autoComplete="email"
            onChange={(event) => {
              setEmail(event.target.value);
            }}
          />
        </label>
        <label className="field">
          Password
          <input
            id="login-password"
            type="password"
            value={password}
            autoComplete="current-password"
            onChange={(event) => {
              setPassword(event.target.value);
            }}
          />
        </label>
        <FormError message={error} />
        <button className="button-primary" type="submit" disabled={pending}>
          {pending ? 'Logging in…' : 'Log in'}
        </button>
        <Link className="switch-link" to="/register">
          Create an account
        </Link>
      </form>
    </div>
  );
}
