import { useState } from 'react';
import type { FormEvent } from 'react';
import { messageOf, signIn } from '../api.ts';
import { FormError } from '../FormError.tsx';
import type { User } from '../types.ts';

interface SignInPageProps {
  onSignedIn: (user: User) => void;
}

export function SignInPage({ onSignedIn }: SignInPageProps) {
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [name, setName] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [loginError, setLoginError] = useState('');
  const [pending, setPending] = useState<'register' | 'login' | null>(null);

  async function onRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRegisterError('');
    setPending('register');
    try {
      const user = await signIn('/auth/register', {
        email: registerEmail.trim(),
        password: registerPassword,
        name: name.trim(),
      });
      onSignedIn(user);
    } catch (error: unknown) {
      setRegisterError(messageOf(error));
    } finally {
      setPending(null);
    }
  }

  async function onLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError('');
    setPending('login');
    try {
      const user = await signIn('/auth/login', {
        email: loginEmail.trim(),
        password: loginPassword,
      });
      onSignedIn(user);
    } catch (error: unknown) {
      setLoginError(messageOf(error));
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="page">
      <header className="top">
        <h1 className="brand">TheraTax</h1>
      </header>
      <p className="lede">Sign in to log sessions, receipts, and invoices.</p>
      <div className="split">
        <form className="card stack" onSubmit={onRegister}>
          <h2>Register</h2>
          <label className="field">
            Name
            <input
              id="register-name"
              value={name}
              autoComplete="name"
              onChange={(event) => {
                setName(event.target.value);
              }}
            />
          </label>
          <label className="field">
            Email
            <input
              id="register-email"
              type="email"
              value={registerEmail}
              autoComplete="email"
              onChange={(event) => {
                setRegisterEmail(event.target.value);
              }}
            />
          </label>
          <label className="field">
            Password
            <input
              id="register-password"
              type="password"
              value={registerPassword}
              autoComplete="new-password"
              onChange={(event) => {
                setRegisterPassword(event.target.value);
              }}
            />
          </label>
          <FormError message={registerError} />
          <button className="button-primary" type="submit" disabled={pending !== null}>
            {pending === 'register' ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        <form className="card stack" onSubmit={onLogin}>
          <h2>Log in</h2>
          <label className="field">
            Email
            <input
              id="login-email"
              type="email"
              value={loginEmail}
              autoComplete="email"
              onChange={(event) => {
                setLoginEmail(event.target.value);
              }}
            />
          </label>
          <label className="field">
            Password
            <input
              id="login-password"
              type="password"
              value={loginPassword}
              autoComplete="current-password"
              onChange={(event) => {
                setLoginPassword(event.target.value);
              }}
            />
          </label>
          <FormError message={loginError} />
          <button className="button-primary" type="submit" disabled={pending !== null}>
            {pending === 'login' ? 'Logging in…' : 'Log in'}
          </button>
        </form>
      </div>
    </div>
  );
}
