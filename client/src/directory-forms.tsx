import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { AddressFields } from './address-fields.tsx';
import {
  addressError,
  addressFromRecord,
  addressPayload,
  emptyAddress,
} from './address.ts';
import type { AddressDraft } from './address.ts';
import { messageOf, request } from './api.ts';
import { FormError } from './FormError.tsx';
import {
  compareHourExtras,
  formatPounds,
  HOUR_EXTRA_OPTIONS,
  hourExtraLabel,
  readAmountPence,
  splitAmount,
} from './format.ts';
import type { Client, HourExtra, HourExtraType, Workplace, WorkplaceKind } from './types.ts';

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
  const [address, setAddress] = useState<AddressDraft>(emptyAddress());
  const [extras, setExtras] = useState<HourExtra[]>([]);
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
    const addressProblem = addressError(address);
    if (addressProblem !== '') {
      setError(addressProblem);
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
          hourExtras: extrasPayload(extras),
          ...addressPayload(address),
        },
      });
      setName('');
      setHourPounds('');
      setHourPence('');
      setAddress(emptyAddress());
      setExtras([]);
      onCreated(created);
    } catch (caught: unknown) {
      setError(messageOf(caught));
    } finally {
      setSaving(false);
    }
  }

  const label = picked === 'spa' ? 'Save spa' : 'Save clinic';

  return (
    <form
      className="subcard"
      onSubmit={(event) => {
        keepSubmitHere(event);
        void save();
      }}
    >
      <p className="muted">Save a spa or clinic once, then choose it on the next rows.</p>
      <label className="field">
        Workplace name
        <input
          value={name}
          maxLength={200}
          onChange={(event) => {
            setName(event.target.value);
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
      <HourExtrasEditor extras={extras} onChange={setExtras} disabled={saving} />
      <AddressFields draft={address} onChange={setAddress} />
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
      <button className="button-ghost" type="submit" disabled={saving}>
        {saving ? 'Saving…' : label}
      </button>
    </form>
  );
}

export function EditWorkplaceForm({
  workplace,
  onSaved,
  onCancel,
}: {
  workplace: Workplace;
  onSaved: (workplace: Workplace) => void;
  onCancel: () => void;
}) {
  const hour = splitAmount(workplace.hourRatePence);
  const [name, setName] = useState(workplace.name);
  const [hourPounds, setHourPounds] = useState(hour.pounds);
  const [hourPence, setHourPence] = useState(hour.pence);
  const [address, setAddress] = useState<AddressDraft>(addressFromRecord(workplace));
  const [extras, setExtras] = useState<HourExtra[]>(workplace.hourExtras);
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
    const addressProblem = addressError(address);
    if (addressProblem !== '') {
      setError(addressProblem);
      return;
    }
    setError('');
    setSaving(true);
    try {
      const updated = await request<Workplace>(`/workplaces/${workplace.id}`, {
        method: 'PATCH',
        json: {
          name: name.trim(),
          hourRatePence: hourRate.amountPence,
          hourExtras: extrasPayload(extras),
          ...addressPayload(address),
        },
      });
      onSaved(updated);
    } catch (caught: unknown) {
      setError(messageOf(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className="subcard"
      onSubmit={(event) => {
        keepSubmitHere(event);
        void save();
      }}
    >
      <p className="muted">{workplace.kind === 'spa' ? 'Spa' : 'Clinic'}</p>
      <label className="field">
        Workplace name
        <input
          value={name}
          maxLength={200}
          onChange={(event) => {
            setName(event.target.value);
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
      <HourExtrasEditor extras={extras} onChange={setExtras} disabled={saving} />
      <AddressFields draft={address} onChange={setAddress} />
      <FormError message={error} />
      <div className="actions">
        <button className="button-ghost" type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button className="button-ghost" type="button" disabled={saving} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

export function SaveClientForm({ onCreated }: { onCreated: (client: Client) => void }) {
  const [name, setName] = useState('');
  const [hourPounds, setHourPounds] = useState('');
  const [hourPence, setHourPence] = useState('');
  const [address, setAddress] = useState<AddressDraft>(emptyAddress());
  const [extras, setExtras] = useState<HourExtra[]>([]);
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
    const addressProblem = addressError(address);
    if (addressProblem !== '') {
      setError(addressProblem);
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
          hourExtras: extrasPayload(extras),
          ...addressPayload(address),
        },
      });
      setName('');
      setHourPounds('');
      setHourPence('');
      setAddress(emptyAddress());
      setExtras([]);
      onCreated(created);
    } catch (caught: unknown) {
      setError(messageOf(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className="subcard"
      onSubmit={(event) => {
        keepSubmitHere(event);
        void save();
      }}
    >
      <p className="muted">Save a client once, then choose that person on the next rows.</p>
      <label className="field">
        Client name
        <input
          value={name}
          maxLength={200}
          onChange={(event) => {
            setName(event.target.value);
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
      <HourExtrasEditor extras={extras} onChange={setExtras} disabled={saving} />
      <AddressFields draft={address} onChange={setAddress} />
      <FormError message={error} />
      <button className="button-ghost" type="submit" disabled={saving}>
        {saving ? 'Saving…' : 'Save client'}
      </button>
    </form>
  );
}

export function EditClientForm({
  client,
  onSaved,
  onCancel,
}: {
  client: Client;
  onSaved: (client: Client) => void;
  onCancel: () => void;
}) {
  const hour = splitAmount(client.hourRatePence);
  const [name, setName] = useState(client.name);
  const [hourPounds, setHourPounds] = useState(hour.pounds);
  const [hourPence, setHourPence] = useState(hour.pence);
  const [address, setAddress] = useState<AddressDraft>(addressFromRecord(client));
  const [extras, setExtras] = useState<HourExtra[]>(client.hourExtras);
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
    const addressProblem = addressError(address);
    if (addressProblem !== '') {
      setError(addressProblem);
      return;
    }
    setError('');
    setSaving(true);
    try {
      const updated = await request<Client>(`/clients/${client.id}`, {
        method: 'PATCH',
        json: {
          name: name.trim(),
          hourRatePence: hourRate.amountPence,
          hourExtras: extrasPayload(extras),
          ...addressPayload(address),
        },
      });
      onSaved(updated);
    } catch (caught: unknown) {
      setError(messageOf(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className="subcard"
      onSubmit={(event) => {
        keepSubmitHere(event);
        void save();
      }}
    >
      <label className="field">
        Client name
        <input
          value={name}
          maxLength={200}
          onChange={(event) => {
            setName(event.target.value);
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
      <HourExtrasEditor extras={extras} onChange={setExtras} disabled={saving} />
      <AddressFields draft={address} onChange={setAddress} />
      <FormError message={error} />
      <div className="actions">
        <button className="button-ghost" type="submit" disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button className="button-ghost" type="button" disabled={saving} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function HourExtrasEditor({
  extras,
  onChange,
  disabled,
}: {
  extras: readonly HourExtra[];
  onChange: (extras: HourExtra[]) => void;
  disabled: boolean;
}) {
  const [massageType, setMassageType] = useState<HourExtraType>('pregnancy');
  const [customName, setCustomName] = useState('');
  const [pounds, setPounds] = useState('');
  const [pence, setPence] = useState('');
  const [error, setError] = useState('');
  const shown = [...extras].sort(compareHourExtras);

  function addExtra() {
    const money = readAmountPence(pounds, pence);
    if (!money.ok) {
      setError(money.message);
      return;
    }
    if (money.amountPence < 1) {
      setError('Enter an extra amount.');
      return;
    }
    const custom = customName.trim();
    if (massageType === 'other' && custom === '') {
      setError('Custom massage type is required');
      return;
    }
    const next: HourExtra =
      massageType === 'other'
        ? { massageType, customMassageType: custom, extraPence: money.amountPence }
        : { massageType, extraPence: money.amountPence };
    if (extras.some((row) => hourExtraKey(row) === hourExtraKey(next))) {
      setError('Hour extra already set for this massage type');
      return;
    }
    setError('');
    onChange([...extras, next]);
    setCustomName('');
    setPounds('');
    setPence('');
  }

  return (
    <fieldset
      disabled={disabled}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' || !(event.target instanceof HTMLInputElement)) {
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        addExtra();
      }}
    >
      <legend>Extra per hour</legend>
      <div className="list">
        {shown.map((extra) => (
          <div key={hourExtraKey(extra)} className="directory-row">
            <span>
              {hourExtraLabel(extra)} +{formatPounds(extra.extraPence)}/hour
            </span>
            <button
              className="button-ghost"
              type="button"
              onClick={() => {
                onChange(extras.filter((row) => hourExtraKey(row) !== hourExtraKey(extra)));
              }}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <label className="field">
        Massage type
        <select
          value={massageType}
          onChange={(event) => {
            const value = event.target.value;
            if (isHourExtraType(value)) {
              setMassageType(value);
            }
          }}
        >
          {HOUR_EXTRA_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      {massageType === 'other' ? (
        <label className="field">
          Treatment name
          <input
            value={customName}
            maxLength={100}
            onChange={(event) => {
              setCustomName(event.target.value);
            }}
          />
        </label>
      ) : null}
      <MoneyFields legend="Extra" pounds={pounds} pence={pence} onPounds={setPounds} onPence={setPence} />
      <FormError message={error} />
      <button className="button-ghost" type="button" onClick={addExtra}>
        Add treatment
      </button>
      <span className="muted">Add one row per treatment that pays more than the hour rate.</span>
    </fieldset>
  );
}

function MoneyFields({
  legend,
  pounds,
  pence,
  onPounds,
  onPence,
}: {
  legend: string;
  pounds: string;
  pence: string;
  onPounds: (value: string) => void;
  onPence: (value: string) => void;
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
    </fieldset>
  );
}

function keepSubmitHere(event: FormEvent<HTMLFormElement>): void {
  event.preventDefault();
  event.stopPropagation();
}

function extrasPayload(extras: readonly HourExtra[]): HourExtra[] {
  return [...extras].sort(compareHourExtras).map((extra) =>
    extra.massageType === 'other'
      ? {
          massageType: extra.massageType,
          customMassageType: extra.customMassageType ?? '',
          extraPence: extra.extraPence,
        }
      : { massageType: extra.massageType, extraPence: extra.extraPence },
  );
}

function hourExtraKey(extra: HourExtra): string {
  if (extra.massageType === 'other') {
    return `other:${(extra.customMassageType ?? '').trim().toLowerCase()}`;
  }
  return extra.massageType;
}

function isHourExtraType(value: string): value is HourExtraType {
  return HOUR_EXTRA_OPTIONS.some((option) => option.value === value);
}

export function insertByName<T extends { id: number; name: string }>(rows: readonly T[], created: T): T[] {
  return [...rows, created].sort(
    (left, right) => left.name.localeCompare(right.name) || left.id - right.id,
  );
}

export function replaceByName<T extends { id: number; name: string }>(rows: readonly T[], updated: T): T[] {
  return rows
    .map((row) => (row.id === updated.id ? updated : row))
    .sort((left, right) => left.name.localeCompare(right.name) || left.id - right.id);
}
