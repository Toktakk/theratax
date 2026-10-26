import { useState } from 'react';
import type { FormEvent } from 'react';
import { messageOf, request } from '../api.ts';
import { FormError } from '../FormError.tsx';
import { asReadyUser } from '../types.ts';
import type { ExpenseMethod, PracticeType, User } from '../types.ts';

interface OnboardingPageProps {
  user: User;
  onComplete: (user: User) => void;
  onLogout: () => void;
}

export function OnboardingPage({ user, onComplete, onLogout }: OnboardingPageProps) {
  const [practiceType, setPracticeType] = useState<PracticeType | null>(null);
  const [expenseMethod, setExpenseMethod] = useState<ExpenseMethod | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (practiceType === null || expenseMethod === null) {
      return;
    }
    setError('');
    setSaving(true);
    try {
      const updated = await request<User>('/users/me/onboarding', {
        method: 'PATCH',
        json: { practiceType, expenseMethod },
      });
      if (asReadyUser(updated) === null) {
        setError('Onboarding did not complete.');
        return;
      }
      onComplete(updated);
    } catch (caught: unknown) {
      setError(messageOf(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <header className="top">
        <div>
          <h1 className="brand">TheraTax</h1>
          <p className="who">{user.name}</p>
        </div>
        <button className="button-ghost" type="button" onClick={onLogout}>
          Log out
        </button>
      </header>
      <form className="card stack" onSubmit={onSubmit}>
        <h2>Set up your practice</h2>
        <p className="muted">This happens once.</p>
        <fieldset>
          <legend>How you work</legend>
          <label className="choice">
            <input
              type="radio"
              name="practiceType"
              value="mobile"
              checked={practiceType === 'mobile'}
              onChange={() => {
                setPracticeType('mobile');
              }}
            />
            Travels to the client
          </label>
          <label className="choice">
            <input
              type="radio"
              name="practiceType"
              value="fixedLocation"
              checked={practiceType === 'fixedLocation'}
              onChange={() => {
                setPracticeType('fixedLocation');
              }}
            />
            Clinic
          </label>
          <label className="choice">
            <input
              type="radio"
              name="practiceType"
              value="mixed"
              checked={practiceType === 'mixed'}
              onChange={() => {
                setPracticeType('mixed');
              }}
            />
            Both
          </label>
        </fieldset>
        <fieldset>
          <legend>Vehicle costs</legend>
          <p className="muted">
            This method applies to the car only. Massage oils, HCPC fees,
            insurance, and laundry are still typed as amounts. After
            single-rate mileage is chosen it cannot be changed back.
          </p>
          <label className="choice">
            <input
              type="radio"
              name="expenseMethod"
              value="flat_rate"
              checked={expenseMethod === 'flat_rate'}
              onChange={() => {
                setExpenseMethod('flat_rate');
              }}
            />
            Single-rate mileage
          </label>
          <label className="choice">
            <input
              type="radio"
              name="expenseMethod"
              value="actual_cost"
              checked={expenseMethod === 'actual_cost'}
              onChange={() => {
                setExpenseMethod('actual_cost');
              }}
            />
            Vehicle costs as actually paid
          </label>
        </fieldset>
        <FormError message={error} />
        <button
          className="button-primary"
          type="submit"
          disabled={saving || practiceType === null || expenseMethod === null}
        >
          {saving ? 'Saving…' : 'Continue'}
        </button>
      </form>
    </div>
  );
}
