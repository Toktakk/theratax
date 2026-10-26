import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { messageOf, signIn } from '../api.ts';
import { FormError } from '../FormError.tsx';
import type { User } from '../types.ts';

interface RegisterPageProps {
  onSignedIn: (user: User) => void;
}

export function RegisterPage({ onSignedIn }: RegisterPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function onRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setPending(true);
    try {
      const user = await signIn('/auth/register', {
        email: email.trim(),
        password,
        name: name.trim(),
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
            id="register-password"
            type="password"
            value={password}
            autoComplete="new-password"
            onChange={(event) => {
              setPassword(event.target.value);
            }}
          />
        </label>
        <FormError message={error} />
        <button className="button-primary" type="submit" disabled={pending}>
          {pending ? 'Creating account…' : 'Create account'}
        </button>
        <Link className="switch-link" to="/">
          Already have an account? Log in
        </Link>
      </form>
    </div>
  );
}
