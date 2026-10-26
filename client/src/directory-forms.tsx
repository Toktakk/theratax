import { useEffect, useState } from 'react';
import { messageOf, request } from './api.ts';
import { FormError } from './FormError.tsx';
import { readAmountPence, readOptionalAmount } from './format.ts';
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
  const [hourPounds, setHourPounds] = useState('');
  const [hourPence, setHourPence] = useState('');
  const [extraPounds, setExtraPounds] = useState('');
  const [extraPence, setExtraPence] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (kind !== undefined) {
      setPicked(kind);
    }
  }, [kind]);

  async function save() {
    const hourRate = readAmountPence(hourPounds, hourPence);
    if (!hourRate.ok) {
      setError(hourRate.message);
      return;
    }
    if (hourRate.amountPence < 1) {
      setError('Enter an hour rate.');
      return;
    }
    const extra = readOptionalAmount(extraPounds, extraPence);
    if (!extra.ok) {
      setError(extra.message);
      return;
    }
    setError('');
    setSaving(true);
    try {
      const created = await request<Workplace>('/workplaces', {
        method: 'POST',
        json: {
          name: name.trim(),
          kind: picked,
          hourRatePence: hourRate.amountPence,
          ...(extra.amountPence !== undefined ? { pregnancyExtraPence: extra.amountPence } : {}),
        },
      });
      setName('');
      setHourPounds('');
      setHourPence('');
      setExtraPounds('');
      setExtraPence('');
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
      <MoneyFields
        legend="Hour rate"
        pounds={hourPounds}
        pence={hourPence}
        onPounds={setHourPounds}
        onPence={setHourPence}
      />
      <MoneyFields
        legend="Pregnancy extra per hour"
        pounds={extraPounds}
        pence={extraPence}
        onPounds={setExtraPounds}
        onPence={setExtraPence}
        hint="Leave empty when pregnancy massage uses the same hourly rate."
      />
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
  const [hourPounds, setHourPounds] = useState('');
  const [hourPence, setHourPence] = useState('');
  const [extraPounds, setExtraPounds] = useState('');
  const [extraPence, setExtraPence] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    const hourRate = readAmountPence(hourPounds, hourPence);
    if (!hourRate.ok) {
      setError(hourRate.message);
      return;
    }
    if (hourRate.amountPence < 1) {
      setError('Enter an hour rate.');
      return;
    }
    const extra = readOptionalAmount(extraPounds, extraPence);
    if (!extra.ok) {
      setError(extra.message);
      return;
    }
    setError('');
    setSaving(true);
    try {
      const created = await request<Client>('/clients', {
        method: 'POST',
        json: {
          name: name.trim(),
          hourRatePence: hourRate.amountPence,
          ...(extra.amountPence !== undefined ? { pregnancyExtraPence: extra.amountPence } : {}),
        },
      });
      setName('');
      setHourPounds('');
      setHourPence('');
      setExtraPounds('');
      setExtraPence('');
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
      <MoneyFields
        legend="Hour rate"
        pounds={hourPounds}
        pence={hourPence}
        onPounds={setHourPounds}
        onPence={setHourPence}
      />
      <MoneyFields
        legend="Pregnancy extra per hour"
        pounds={extraPounds}
        pence={extraPence}
        onPounds={setExtraPounds}
        onPence={setExtraPence}
        hint="Leave empty when pregnancy massage uses the same hourly rate."
      />
      <FormError message={error} />
      <button className="button-ghost" type="button" disabled={saving} onClick={() => void save()}>
        {saving ? 'Saving…' : 'Save client'}
      </button>
    </div>
  );
}

function MoneyFields({
  legend,
  pounds,
  pence,
  onPounds,
  onPence,
  hint,
}: {
  legend: string;
  pounds: string;
  pence: string;
  onPounds: (value: string) => void;
  onPence: (value: string) => void;
  hint?: string;
}) {
  return (
    <fieldset>
      <legend>{legend}</legend>
      <div className="money-fields">
        <label className="field">
          Pounds
          <input
            inputMode="numeric"
            value={pounds}
            onChange={(event) => {
              onPounds(event.target.value);
            }}
          />
        </label>
        <label className="field">
          Pence
          <input
            inputMode="numeric"
            maxLength={2}
            value={pence}
            onChange={(event) => {
              onPence(event.target.value);
            }}
          />
        </label>
      </div>
      {hint === undefined ? null : <span className="muted">{hint}</span>}
    </fieldset>
  );
}

export function insertByName<T extends { id: number; name: string }>(rows: readonly T[], created: T): T[] {
  return [...rows, created].sort(
    (left, right) => left.name.localeCompare(right.name) || left.id - right.id,
  );
}
