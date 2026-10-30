import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { AddressFields } from '../address-fields.tsx';
import {
  addressError,
  addressPayload,
  emptyAddress,
  formatAddress,
  hasAddress,
} from '../address.ts';
import type { AddressDraft } from '../address.ts';
import { downloadFile, messageOf, request } from '../api.ts';
import { requestAll, requestList } from '../list-page.ts';
import {
  EditClientForm,
  EditWorkplaceForm,
  insertByName,
  SaveClientForm,
  SaveWorkplaceForm,
} from '../directory-forms.tsx';
import { FormError } from '../FormError.tsx';
import { civilDateFromInput, formatPounds } from '../format.ts';
import type {
  Client,
  Invoice,
  InvoiceDraft,
  InvoiceLine,
  InvoicePeriod,
  InvoicePreview,
  RecipientKind,
  User,
  Workplace,
} from '../types.ts';

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
] as const;

export function InvoicePage({
  user,
  onUserUpdated,
}: {
  user: User;
  onUserUpdated: (user: User) => void;
}) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoiceTotal, setInvoiceTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [payingId, setPayingId] = useState<number | null>(null);
  const [payDate, setPayDate] = useState<{ id: number; value: string } | null>(null);
  const [pdfId, setPdfId] = useState<number | null>(null);
  const [rowError, setRowError] = useState<{ id: number; message: string } | null>(null);
  const [recipientKind, setRecipientKind] = useState<RecipientKind | ''>('');
  const [workplaceId, setWorkplaceId] = useState('');
  const [clientId, setClientId] = useState('');
  const [period, setPeriod] = useState<InvoicePeriod | ''>('');
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [issuedOn, setIssuedOn] = useState('');
  const [workplaces, setWorkplaces] = useState<Workplace[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [workplacesLoading, setWorkplacesLoading] = useState(true);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [directoryError, setDirectoryError] = useState('');
  const [preview, setPreview] = useState<InvoicePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');

  const draft = buildDraft({
    recipientKind,
    workplaceId,
    clientId,
    period,
    day,
    month,
    year,
    issuedOn,
  });
  const workplaceChoices =
    recipientKind === 'spa' || recipientKind === 'clinic'
      ? workplaces.filter((workplace) => workplace.kind === recipientKind)
      : [];
  const chosenWorkplace = workplaceChoices.find((workplace) => String(workplace.id) === workplaceId);
  const chosenClient = clients.find((client) => String(client.id) === clientId);
  const recipientMissingAddress =
    (chosenWorkplace !== undefined && !hasAddress(chosenWorkplace)) ||
    (chosenClient !== undefined && !hasAddress(chosenClient));

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    requestList<Invoice>('/invoices')
      .then((body) => {
        if (!cancelled) {
          setInvoices(body.items);
          setInvoiceTotal(body.total);
          setPageError('');
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setPageError(messageOf(error));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    let cancelled = false;
    setWorkplacesLoading(true);
    setClientsLoading(true);
    requestAll<Workplace>('/workplaces')
      .then((rows) => {
        if (!cancelled) {
          setWorkplaces(rows);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setDirectoryError(messageOf(error));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setWorkplacesLoading(false);
        }
      });
    requestAll<Client>('/clients')
      .then((rows) => {
        if (!cancelled) {
          setClients(rows);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setDirectoryError(messageOf(error));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setClientsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const next = buildDraft({
      recipientKind,
      workplaceId,
      clientId,
      period,
      day,
      month,
      year,
      issuedOn,
    });
    if (next === null) {
      setPreview(null);
      setPreviewError('');
      setPreviewLoading(false);
      return;
    }
    let cancelled = false;
    setPreview(null);
    setPreviewError('');
    setPreviewLoading(true);
    request<InvoicePreview>(`/invoices/preview?${previewSearch(next)}`)
      .then((body) => {
        if (!cancelled) {
          setPreview(body);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setPreviewError(messageOf(error));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setPreviewLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [recipientKind, workplaceId, clientId, period, day, month, year, issuedOn]);

  function clearForm() {
    setRecipientKind('');
    setWorkplaceId('');
    setClientId('');
    setPeriod('');
    setDay('');
    setMonth('');
    setYear('');
    setIssuedOn('');
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      draft === null ||
      preview === null ||
      preview.lines.length === 0 ||
      !hasAddress(user) ||
      recipientMissingAddress
    ) {
      return;
    }
    setFormError('');
    setSaving(true);
    try {
      await request('/invoices', { method: 'POST', json: draft });
      clearForm();
      setReloadKey((value) => value + 1);
    } catch (error: unknown) {
      setFormError(messageOf(error));
    } finally {
      setSaving(false);
    }
  }

  async function showMoreInvoices() {
    setLoadingMore(true);
    setPageError('');
    try {
      const body = await requestList<Invoice>('/invoices', invoices.length);
      setInvoices((current) => [...current, ...body.items]);
      setInvoiceTotal(body.total);
    } catch (error: unknown) {
      setPageError(messageOf(error));
    } finally {
      setLoadingMore(false);
    }
  }

  async function pay(invoice: Invoice, receivedOn: string) {
    const paidOn = civilDateFromInput(receivedOn);
    if (paidOn === undefined) {
      setRowError({ id: invoice.id, message: 'Enter the date the money arrived.' });
      return;
    }
    if (isBeforeCivilDate(paidOn, invoice.issuedOn)) {
      setRowError({
        id: invoice.id,
        message: `This bill is dated ${invoice.issuedOn}. Enter the day the money arrived, on or after that date.`,
      });
      return;
    }
    setPayingId(invoice.id);
    setRowError(null);
    try {
      const updated = await request<Invoice>(`/invoices/${invoice.id}`, {
        method: 'PATCH',
        json: { status: 'paid', paidOn },
      });
      setInvoices((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setPayDate(null);
    } catch (error: unknown) {
      setRowError({ id: invoice.id, message: messageOf(error) });
    } finally {
      setPayingId(null);
    }
  }

  async function download(invoice: Invoice) {
    setPdfId(invoice.id);
    setRowError(null);
    try {
      await downloadFile(`/invoices/${invoice.id}/pdf`, `${invoice.number}.pdf`);
    } catch (error: unknown) {
      setRowError({ id: invoice.id, message: messageOf(error) });
    } finally {
      setPdfId(null);
    }
  }

  const createDisabled =
    saving ||
    previewLoading ||
    previewError !== '' ||
    preview === null ||
    preview.lines.length === 0 ||
    !hasAddress(user) ||
    recipientMissingAddress;

  return (
    <div className="stack invoice-page">
      <h2>Invoices</h2>
      <form className="card stack" onSubmit={onSubmit}>
        {hasAddress(user) ? (
          <p className="muted">
            Business address: {formatAddress(user)}{' '}
            <Link className="switch-link" to="/profile">
              Edit address
            </Link>
          </p>
        ) : (
          <BusinessAddressForm onSaved={onUserUpdated} />
        )}
        <fieldset>
          <legend>Recipient</legend>
          <div className="inline-choices">
            <RecipientChoice
              label="Spa"
              value="spa"
              current={recipientKind}
              onPick={(value) => {
                setRecipientKind(value);
                setWorkplaceId('');
                setClientId('');
              }}
            />
            <RecipientChoice
              label="Clinic"
              value="clinic"
              current={recipientKind}
              onPick={(value) => {
                setRecipientKind(value);
                setWorkplaceId('');
                setClientId('');
              }}
            />
            <RecipientChoice
              label="Client"
              value="client"
              current={recipientKind}
              onPick={(value) => {
                setRecipientKind(value);
                setWorkplaceId('');
                setClientId('');
              }}
            />
          </div>
        </fieldset>
        {recipientKind === 'spa' || recipientKind === 'clinic' ? (
          <>
            {workplacesLoading ? <p className="muted">Loading workplaces…</p> : null}
            <label className="field">
              {recipientKind === 'spa' ? 'Spa' : 'Clinic'}
              <select
                value={workplaceId}
                onChange={(event) => {
                  setWorkplaceId(event.target.value);
                }}
              >
                <option value="">Choose a saved {recipientKind}</option>
                {workplaceChoices.map((workplace) => (
                  <option key={workplace.id} value={String(workplace.id)}>
                    {workplace.name}
                  </option>
                ))}
              </select>
            </label>
            <SaveWorkplaceForm
              kind={recipientKind}
              onCreated={(workplace) => {
                setWorkplaces((current) => insertByName(current, workplace));
                setWorkplaceId(String(workplace.id));
                setDirectoryError('');
              }}
            />
            {chosenWorkplace !== undefined && !hasAddress(chosenWorkplace) ? (
              <EditWorkplaceForm
                workplace={chosenWorkplace}
                onSaved={(workplace) => {
                  setWorkplaces((current) =>
                    current.map((item) => (item.id === workplace.id ? workplace : item)),
                  );
                }}
                onCancel={() => {
                  setWorkplaceId('');
                }}
              />
            ) : null}
          </>
        ) : null}
        {recipientKind === 'client' ? (
          <>
            {clientsLoading ? <p className="muted">Loading clients…</p> : null}
            <label className="field">
              Client
              <select
                value={clientId}
                onChange={(event) => {
                  setClientId(event.target.value);
                }}
              >
                <option value="">Choose a saved client</option>
                {clients.map((client) => (
                  <option key={client.id} value={String(client.id)}>
                    {client.name}
                  </option>
                ))}
              </select>
            </label>
            <SaveClientForm
              onCreated={(client) => {
                setClients((current) => insertByName(current, client));
                setClientId(String(client.id));
                setDirectoryError('');
              }}
            />
            {chosenClient !== undefined && !hasAddress(chosenClient) ? (
              <EditClientForm
                client={chosenClient}
                onSaved={(client) => {
                  setClients((current) => current.map((item) => (item.id === client.id ? client : item)));
                }}
                onCancel={() => {
                  setClientId('');
                }}
              />
            ) : null}
          </>
        ) : null}
        <FormError message={directoryError} />
        <fieldset>
          <legend>Period</legend>
          <div className="inline-choices">
            <label className="choice">
              <input
                type="radio"
                name="period"
                value="day"
                checked={period === 'day'}
                onChange={() => {
                  setPeriod('day');
                }}
              />
              Daily
            </label>
            <label className="choice">
              <input
                type="radio"
                name="period"
                value="month"
                checked={period === 'month'}
                onChange={() => {
                  setPeriod('month');
                }}
              />
              Monthly
            </label>
          </div>
        </fieldset>
        {period === 'day' ? (
          <label className="field">
            Date
            <input
              type="date"
              value={day}
              onChange={(event) => {
                setDay(event.target.value);
              }}
            />
          </label>
        ) : null}
        {period === 'month' ? (
          <div className="money-fields">
            <label className="field">
              Month
              <select
                value={month}
                onChange={(event) => {
                  setMonth(event.target.value);
                }}
              >
                <option value="">Month</option>
                {MONTHS.map((item) => (
                  <option key={item.value} value={String(item.value)}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Year
              <input
                inputMode="numeric"
                value={year}
                onChange={(event) => {
                  setYear(event.target.value);
                }}
              />
            </label>
          </div>
        ) : null}
        <label className="field">
          Issue date
          <input
            type="date"
            value={issuedOn}
            onChange={(event) => {
              setIssuedOn(event.target.value);
            }}
          />
          <span className="muted">
            Leave blank for today. This is the date on the bill, not the day the spa pays you.
          </span>
        </label>
        <PreviewBlock
          loading={previewLoading}
          error={previewError}
          preview={preview}
          waiting={draft === null}
        />
        <FormError message={formError} />
        <button className="button-primary" type="submit" disabled={createDisabled}>
          {saving ? 'Creating…' : 'Create invoice'}
        </button>
      </form>
      <FormError message={pageError} />
      {loading && invoices.length === 0 ? <p className="muted">Loading invoices…</p> : null}
      {!loading && pageError === '' && invoices.length === 0 ? (
        <p className="muted">No invoices yet.</p>
      ) : null}
      <div className="list">
        {invoices.map((invoice) => (
          <article className="row" key={invoice.id}>
            <h3>{invoice.number}</h3>
            <p>{recipientText(invoice)}</p>
            {periodText(invoice) === null ? null : <p>{periodText(invoice)}</p>}
            {invoice.clientName !== undefined && invoice.service !== undefined ? (
              <p>
                {invoice.clientName} · {invoice.service}
              </p>
            ) : null}
            <p className="amount">{formatPounds(invoice.amountPence)}</p>
            <p>Issued on {invoice.issuedOn}</p>
            <p>Status: {invoice.status}</p>
            {invoice.paidOn === undefined ? null : <p>Paid on {invoice.paidOn}</p>}
            <div className="actions">
              <button
                className="button-ghost"
                type="button"
                disabled={pdfId === invoice.id}
                onClick={() => {
                  void download(invoice);
                }}
              >
                {pdfId === invoice.id ? 'Downloading…' : 'PDF'}
              </button>
              {invoice.status === 'issued' && payDate?.id !== invoice.id ? (
                <button
                  className="button-primary"
                  type="button"
                  onClick={() => {
                    setRowError(null);
                    setPayDate({ id: invoice.id, value: londonDateInput(new Date()) });
                  }}
                >
                  Pay
                </button>
              ) : null}
            </div>
            {invoice.status === 'issued' && payDate?.id === invoice.id ? (
              <label className="field">
                Date received
                <input
                  type="date"
                  value={payDate.value}
                  disabled={payingId === invoice.id}
                  onChange={(event) => {
                    setPayDate({ id: invoice.id, value: event.target.value });
                  }}
                />
                <span className="muted">
                  The day the money arrived. A spa can pay two weeks after the work, or at the end of
                  the month. This day has to be on or after {invoice.issuedOn}.
                </span>
                <div className="actions">
                  <button
                    className="button-primary"
                    type="button"
                    disabled={payingId === invoice.id}
                    onClick={() => {
                      void pay(invoice, payDate.value);
                    }}
                  >
                    {payingId === invoice.id ? 'Paying…' : 'Mark paid'}
                  </button>
                  <button
                    className="button-ghost"
                    type="button"
                    disabled={payingId === invoice.id}
                    onClick={() => {
                      setPayDate(null);
                      setRowError(null);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </label>
            ) : null}
            {rowError?.id === invoice.id ? <FormError message={rowError.message} /> : null}
          </article>
        ))}
      </div>
      {invoiceTotal > invoices.length ? (
        <button
          className="button-ghost"
          type="button"
          disabled={loadingMore}
          onClick={() => {
            void showMoreInvoices();
          }}
        >
          {loadingMore ? 'Loading…' : `Show more (${invoices.length} of ${invoiceTotal})`}
        </button>
      ) : null}
    </div>
  );
}

function RecipientChoice({
  label,
  value,
  current,
  onPick,
}: {
  label: string;
  value: RecipientKind;
  current: RecipientKind | '';
  onPick: (value: RecipientKind) => void;
}) {
  return (
    <label className="choice">
      <input
        type="radio"
        name="recipientKind"
        value={value}
        checked={current === value}
        onChange={() => {
          onPick(value);
        }}
      />
      {label}
    </label>
  );
}

function PreviewBlock({
  loading,
  error,
  preview,
  waiting,
}: {
  loading: boolean;
  error: string;
  preview: InvoicePreview | null;
  waiting: boolean;
}) {
  if (waiting) {
    return <p className="muted">Choose a recipient and a period to preview the bill.</p>;
  }
  if (loading) {
    return <p className="muted">Loading preview…</p>;
  }
  if (error !== '') {
    return <FormError message={error} />;
  }
  if (preview === null) {
    return null;
  }
  return (
    <div className="stack">
      <h3>Preview · {preview.recipientName}</h3>
      <p className="muted">
        {preview.periodStart} to {preview.periodEnd}
      </p>
      {preview.lines.length === 0 ? <p className="muted">No lines.</p> : <LineList lines={preview.lines} />}
      <p className="amount">Total {formatPounds(preview.amountPence)}</p>
    </div>
  );
}

function LineList({ lines }: { lines: readonly InvoiceLine[] }) {
  return (
    <div className="stack">
      {lines.map((line, index) => (
        <div className="parts" key={`${line.occurredOn}-${line.description}-${index}`}>
          <p>
            {line.occurredOn} · {line.description}
          </p>
          <p className="muted">
            {line.quantity} {line.quantityUnit} · {formatPounds(line.ratePence)} ·{' '}
            {formatPounds(line.amountPence)}
          </p>
        </div>
      ))}
    </div>
  );
}

function recipientText(invoice: Invoice): string {
  const name = invoice.recipientName ?? invoice.clientName ?? 'Recipient';
  if (invoice.recipientKind === 'spa') {
    return `${name} · Spa`;
  }
  if (invoice.recipientKind === 'clinic') {
    return `${name} · Clinic`;
  }
  if (invoice.recipientKind === 'client') {
    return `${name} · Client`;
  }
  return name;
}

function periodText(invoice: Invoice): string | null {
  if (invoice.periodStart === undefined || invoice.periodEnd === undefined) {
    return null;
  }
  if (invoice.period === 'day' || invoice.periodStart === invoice.periodEnd) {
    return invoice.periodStart;
  }
  return `${invoice.periodStart} to ${invoice.periodEnd}`;
}

function buildDraft(input: {
  recipientKind: RecipientKind | '';
  workplaceId: string;
  clientId: string;
  period: InvoicePeriod | '';
  day: string;
  month: string;
  year: string;
  issuedOn: string;
}): InvoiceDraft | null {
  if (input.recipientKind === '' || input.period === '') {
    return null;
  }
  const draft: InvoiceDraft = {
    recipientKind: input.recipientKind,
    period: input.period,
  };
  if (input.recipientKind === 'client') {
    const id = wholeId(input.clientId);
    if (id === undefined) {
      return null;
    }
    draft.clientId = id;
  } else {
    const id = wholeId(input.workplaceId);
    if (id === undefined) {
      return null;
    }
    draft.workplaceId = id;
  }
  if (input.period === 'day') {
    const date = civilDateFromInput(input.day);
    if (date === undefined) {
      return null;
    }
    draft.date = date;
  } else {
    if (!/^\d+$/.test(input.month) || !/^\d+$/.test(input.year)) {
      return null;
    }
    draft.month = Number(input.month);
    draft.year = Number(input.year);
  }
  const issued = civilDateFromInput(input.issuedOn);
  if (issued !== undefined) {
    draft.issuedOn = issued;
  }
  return draft;
}

function londonDateInput(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(now);
  const day = parts.find((part) => part.type === 'day')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const year = parts.find((part) => part.type === 'year')?.value;
  if (day === undefined || month === undefined || year === undefined) {
    return '';
  }
  return `${year}-${month}-${day}`;
}

function isBeforeCivilDate(left: string, right: string): boolean {
  const leftKey = civilSortKey(left);
  const rightKey = civilSortKey(right);
  if (leftKey === undefined || rightKey === undefined) {
    return false;
  }
  return leftKey < rightKey;
}

function civilSortKey(value: string): string | undefined {
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value);
  if (match === null) {
    return undefined;
  }
  return `${match[3]}${match[2]}${match[1]}`;
}

function wholeId(value: string): number | undefined {
  if (!/^\d+$/.test(value)) {
    return undefined;
  }
  const id = Number(value);
  return id > 0 ? id : undefined;
}

function previewSearch(draft: InvoiceDraft): string {
  const params = new URLSearchParams();
  params.set('recipientKind', draft.recipientKind);
  params.set('period', draft.period);
  if (draft.workplaceId !== undefined) {
    params.set('workplaceId', String(draft.workplaceId));
  }
  if (draft.clientId !== undefined) {
    params.set('clientId', String(draft.clientId));
  }
  if (draft.date !== undefined) {
    params.set('date', draft.date);
  }
  if (draft.month !== undefined) {
    params.set('month', String(draft.month));
  }
  if (draft.year !== undefined) {
    params.set('year', String(draft.year));
  }
  if (draft.issuedOn !== undefined) {
    params.set('issuedOn', draft.issuedOn);
  }
  return params.toString();
}

function BusinessAddressForm({ onSaved }: { onSaved: (user: User) => void }) {
  const [draft, setDraft] = useState<AddressDraft>(emptyAddress());
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    const problem = addressError(draft);
    if (problem !== '') {
      setError(problem);
      return;
    }
    setError('');
    setSaving(true);
    try {
      const updated = await request<User>('/users/me/address', {
        method: 'PATCH',
        json: addressPayload(draft),
      });
      onSaved(updated);
    } catch (caught: unknown) {
      setError(messageOf(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="subcard">
      <p className="muted">Add your business address before issuing an invoice.</p>
      <AddressFields draft={draft} onChange={setDraft} />
      <FormError message={error} />
      <button className="button-ghost" type="button" disabled={saving} onClick={() => void save()}>
        {saving ? 'Saving…' : 'Save address'}
      </button>
    </div>
  );
}
