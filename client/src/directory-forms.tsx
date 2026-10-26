import { useEffect, useState } from 'react';
import { messageOf, request } from './api.ts';
import { FormError } from './FormError.tsx';
import type { Client, Workplace, WorkplaceKind } from './types.ts';

export function SaveWorkplaceForm({
  kind,
  onCreated,
}: {
  kind?: WorkplaceKind;
  onCreated: (workplace: Workplace) => void;
}) {
  const [name, setName] = useState('');
  const [picked, setPicked] = useState<WorkplaceKind>(kind ?? 'spa');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (kind !== undefined) {
      setPicked(kind);
    }
  }, [kind]);

  async function save() {
    setError('');
    setSaving(true);
    try {
      const created = await request<Workplace>('/workplaces', {
        method: 'POST',
        json: { name: name.trim(), kind: picked },
      });
      setName('');
      onCreated(created);
    } catch (caught: unknown) {
      setError(messageOf(caught));
    } finally {
      setSaving(false);
    }
  }

  const label = picked === 'spa' ? 'Save spa' : 'Save clinic';

  return (
    <div className="subcard">
      <p className="muted">Save a spa or clinic once, then choose it on the next rows.</p>
      <label className="field">
        Workplace name
        <input
          value={name}
          maxLength={200}
          onChange={(event) => {
            setName(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void save();
            }
          }}
        />
      </label>
      {kind === undefined ? (
        <label className="field">
          Kind
          <select
            value={picked}
            onChange={(event) => {
              const value = event.target.value;
              if (value === 'spa' || value === 'clinic') {
                setPicked(value);
              }
            }}
          >
            <option value="spa">Spa</option>
            <option value="clinic">Clinic</option>
          </select>
        </label>
      ) : null}
      <FormError message={error} />
      <button className="button-ghost" type="button" disabled={saving} onClick={() => void save()}>
        {saving ? 'Saving…' : label}
      </button>
    </div>
  );
}

export function SaveClientForm({ onCreated }: { onCreated: (client: Client) => void }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    setError('');
    setSaving(true);
    try {
      const created = await request<Client>('/clients', {
        method: 'POST',
        json: { name: name.trim() },
      });
      setName('');
      onCreated(created);
    } catch (caught: unknown) {
      setError(messageOf(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="subcard">
      <p className="muted">Save a client once, then choose that person on the next rows.</p>
      <label className="field">
        Client name
        <input
          value={name}
          maxLength={200}
          onChange={(event) => {
            setName(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void save();
            }
          }}
        />
      </label>
      <FormError message={error} />
      <button className="button-ghost" type="button" disabled={saving} onClick={() => void save()}>
        {saving ? 'Saving…' : 'Save client'}
      </button>
    </div>
  );
}

export function insertByName<T extends { id: number; name: string }>(rows: readonly T[], created: T): T[] {
  return [...rows, created].sort(
    (left, right) => left.name.localeCompare(right.name) || left.id - right.id,
  );
}
