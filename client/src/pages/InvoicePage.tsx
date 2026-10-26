import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { downloadFile, messageOf, request } from '../api.ts';
import { FormError } from '../FormError.tsx';
import { civilDateFromInput, formatPounds, readAmountPence } from '../format.ts';
import type { Invoice, ListResponse } from '../types.ts';

export function InvoicePage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [clientName, setClientName] = useState('');
  const [service, setService] = useState('');
  const [pounds, setPounds] = useState('');
  const [pence, setPence] = useState('');
  const [issuedOn, setIssuedOn] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [payingId, setPayingId] = useState<number | null>(null);
  const [pdfId, setPdfId] = useState<number | null>(null);
  const [rowError, setRowError] = useState<{ id: number; message: string } | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    request<ListResponse<Invoice>>('/invoices?limit=100')
      .then((body) => {
        if (!cancelled) {
          setInvoices(body.items);
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

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');
    const money = readAmountPence(pounds, pence);
    if (!money.ok) {
      setFormError(money.message);
      return;
    }
    const payload: {
      clientName: string;
      service: string;
      amountPence?: number;
      issuedOn?: string;
    } = {
      clientName: clientName.trim(),
      service: service.trim(),
    };
    if (money.amountPence > 0) {
      payload.amountPence = money.amountPence;
    }
    const civil = civilDateFromInput(issuedOn);
    if (civil !== undefined) {
      payload.issuedOn = civil;
    }
    setSaving(true);
    try {
      await request('/invoices', { method: 'POST', json: payload });
      setClientName('');
      setService('');
      setPounds('');
      setPence('');
      setIssuedOn('');
      setReloadKey((value) => value + 1);
    } catch (error: unknown) {
      setFormError(messageOf(error));
    } finally {
      setSaving(false);
    }
  }

  async function pay(invoice: Invoice) {
    setPayingId(invoice.id);
    setRowError(null);
    try {
      const updated = await request<Invoice>(`/invoices/${invoice.id}`, {
        method: 'PATCH',
        json: { status: 'paid' },
      });
      setInvoices((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
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
      await downloadFile(
        `/invoices/${invoice.id}/pdf`,
        `${invoice.number}.pdf`,
      );
    } catch (error: unknown) {
      setRowError({ id: invoice.id, message: messageOf(error) });
    } finally {
      setPdfId(null);
    }
  }

  return (
    <div className="stack">
      <h2>Invoices</h2>
      <form className="card stack" onSubmit={onSubmit}>
        <label className="field">
          Client name
          <input
            value={clientName}
            maxLength={200}
            onChange={(event) => {
              setClientName(event.target.value);
            }}
          />
        </label>
        <label className="field">
          Service
          <input
            value={service}
            maxLength={200}
            onChange={(event) => {
              setService(event.target.value);
            }}
          />
        </label>
        <div className="money-fields">
          <label className="field">
            Pounds
            <input
              inputMode="numeric"
              value={pounds}
              onChange={(event) => {
                setPounds(event.target.value);
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
                setPence(event.target.value);
              }}
            />
          </label>
        </div>
        <label className="field">
          Issue date
          <input
            type="date"
            value={issuedOn}
            onChange={(event) => {
              setIssuedOn(event.target.value);
            }}
          />
          <span className="muted">Leave blank for today.</span>
        </label>
        <FormError message={formError} />
        <button className="button-primary" type="submit" disabled={saving}>
          {saving ? 'Creating…' : 'Create invoice'}
        </button>
      </form>
      <FormError message={pageError} />
      {loading && invoices.length === 0 ? (
        <p className="muted">Loading invoices…</p>
      ) : null}
      {!loading && pageError === '' && invoices.length === 0 ? (
        <p className="muted">No invoices yet.</p>
      ) : null}
      <div className="list">
        {invoices.map((invoice) => (
          <article className="row" key={invoice.id}>
            <h3>{invoice.number}</h3>
            <p>
              {invoice.clientName} · {invoice.service}
            </p>
            <p className="amount">{formatPounds(invoice.amountPence)}</p>
            <p className="muted">Issued {invoice.issuedOn}</p>
            <p>Status: {invoice.status}</p>
            <p>
              {invoice.paidOn === undefined
                ? 'No paid date yet'
                : `Paid on ${invoice.paidOn}`}
            </p>
            {invoice.transactionId !== undefined ? (
              <p>Income entry {invoice.transactionId}</p>
            ) : null}
            <div className="actions">
              <button
                className="button-ghost"
                type="button"
                disabled={pdfId === invoice.id}
                onClick={() => {
                  void download(invoice);
                }}
              >
                {pdfId === invoice.id ? 'Downloading…' : 'Download PDF'}
              </button>
              <button
                className="button-primary"
                type="button"
                disabled={payingId === invoice.id}
                onClick={() => {
                  void pay(invoice);
                }}
              >
                {payingId === invoice.id ? 'Marking paid…' : 'Mark paid'}
              </button>
            </div>
            {rowError?.id === invoice.id ? (
              <FormError message={rowError.message} />
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
