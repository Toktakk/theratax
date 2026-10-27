import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { AddressFields } from '../address-fields.tsx';
import { addressError, addressFromRecord, addressPayload } from '../address.ts';
import type { AddressDraft } from '../address.ts';
import { messageOf, request } from '../api.ts';
import { FormError } from '../FormError.tsx';
import { expenseMethodLabel, practiceTypeLabel } from '../format.ts';
import { asReadyUser } from '../types.ts';
import type { ReadyUser, User } from '../types.ts';

interface ProfilePageProps {
  user: ReadyUser;
  onUserUpdated: (user: User) => void;
}

export function ProfilePage({ user, onUserUpdated }: ProfilePageProps) {
  const [draft, setDraft] = useState<AddressDraft>(() => addressFromRecord(user));
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(addressFromRecord(user));
  }, [user.addressLine1, user.addressLine2, user.town, user.postcode]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const problem = addressError(draft);
    if (problem !== '') {
      setError(problem);
      setSaved(false);
      return;
    }
    setError('');
    setSaved(false);
    setSaving(true);
    try {
      const updated = await request<User>('/users/me/address', {
        method: 'PATCH',
        json: addressPayload(draft),
      });
      if (asReadyUser(updated) === null) {
        setError('Address was not saved.');
        return;
      }
      setDraft(addressFromRecord(updated));
      setSaved(true);
      onUserUpdated(updated);
    } catch (caught: unknown) {
      setError(messageOf(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="stack">
      <h2>Profile</h2>
      <dl className="figures card">
        <div>
          <dt>Name</dt>
          <dd>{user.name}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{user.email}</dd>
        </div>
        <div>
          <dt>How you work</dt>
          <dd>{practiceTypeLabel(user.practiceType)}</dd>
        </div>
        <div>
          <dt>Vehicle costs</dt>
          <dd>{expenseMethodLabel(user.expenseMethod)}</dd>
        </div>
      </dl>
      <form className="card stack" onSubmit={onSubmit}>
        <AddressFields
          draft={draft}
          onChange={(next) => {
            setSaved(false);
            setDraft(next);
          }}
        />
        <FormError message={error} />
        {saved ? <p className="muted">Address saved.</p> : null}
        <button className="button-primary" type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save address'}
        </button>
      </form>
    </div>
  );
}
