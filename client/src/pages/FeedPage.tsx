import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { messageOf, request } from '../api.ts';
import { requestAll, requestList } from '../list-page.ts';
import { categoriesForMethod, categoryName } from '../category-filter.ts';
import { FormError } from '../FormError.tsx';
import {
  basePenceFromMinutes,
  civilDateFromInput,
  effectiveHourRatePence,
  expenseMethodLabel,
  formatHours,
  formatMoneyInput,
  formatPounds,
  hoursLabel,
  isMassageType,
  MASSAGE_OPTIONS,
  massageTypeLabel,
  practiceTypeLabel,
  readHours,
  readMoneyText,
  readOptionalMoney,
  readWholeNumber,
} from '../format.ts';
import { suggestCategory } from '../hint.ts';
import type {
  Client,
  DailyIncomeSummary,
  ExpenseCategory,
  MassageType,
  MassageTypeDay,
  ReadyUser,
  ReceiptUrl,
  Transaction,
  Workplace,
  WorkplaceDay,
} from '../types.ts';

const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;
const RECEIPT_FILE_MESSAGE = 'Receipt must be an image or PDF up to 10 MiB';

interface FeedPageProps {
  user: ReadyUser;
}

interface ShownReceipt {
  url: string;
  contentType: string;
}

interface EntryPayload {
  type: 'income' | 'expense';
  occurredOn?: string;
  note?: string;
  amountPence?: number;
  categorySlug?: string;
  miles?: number;
  massageType?: MassageType;
  customMassageType?: string;
  basePence?: number;
  additionalFeePence?: number;
  bonusPence?: number;
  minutes?: number;
  workplaceId?: number;
  clientId?: number;
}

interface IncomePatch {
  occurredOn: string;
  note: string | null;
  amountPence?: number;
  massageType?: MassageType;
  customMassageType?: string | null;
  additionalFeePence?: number;
  bonusPence?: number;
  minutes?: number;
  workplaceId?: number | null;
  clientId?: number | null;
}

export function FeedPage({ user }: FeedPageProps) {
  const [categories, setCategories] = useState<ExpenseCategory[] | null>(null);
  const [categoriesError, setCategoriesError] = useState('');
  const [items, setItems] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [listLoading, setListLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [listError, setListError] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState<'income' | 'expense'>('income');
  const [note, setNote] = useState('');
  const [occurredOn, setOccurredOn] = useState('');
  const [pickedSlug, setPickedSlug] = useState('');
  const [pickedNote, setPickedNote] = useState<string | null>(null);
  const [miles, setMiles] = useState('');
  const [amount, setAmount] = useState('');
  const [massageType, setMassageType] = useState<MassageType | '' | 'cash'>('');
  const [customMassageType, setCustomMassageType] = useState('');
  const [party, setParty] = useState('');
  const [hours, setHours] = useState('');
  const [fee, setFee] = useState('');
  const [bonus, setBonus] = useState('');
  const [workplaces, setWorkplaces] = useState<Workplace[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [workplacesLoading, setWorkplacesLoading] = useState(true);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [directoryError, setDirectoryError] = useState('');
  const [summary, setSummary] = useState<DailyIncomeSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState('');
  const [photos, setPhotos] = useState<Record<number, ShownReceipt>>({});
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const noteRef = useRef<HTMLInputElement>(null);
  const receiptRef = useRef<HTMLInputElement>(null);

  const allowed =
    categories === null ? [] : categoriesForMethod(categories, user.expenseMethod);
  const suggestion = suggestCategory(allowed, note);
  const categorySlug = pickedNote === note ? pickedSlug : (suggestion?.slug ?? pickedSlug);
  const selected = allowed.find((category) => category.slug === categorySlug);
  const mileage = type === 'expense' && selected?.kind === 'mileage';
  const massage = type === 'income' && isMassageType(massageType);
  const visibleItems = items.filter((item) => item.type === type);
  const receiptKey = items
    .filter((item) => item.hasReceipt)
    .map((item) => item.id)
    .join(',');
  const summaryDate = civilDateFromInput(occurredOn);

  useEffect(() => {
    let cancelled = false;
    request<ExpenseCategory[]>('/expense-categories')
      .then((rows) => {
        if (!cancelled) {
          setCategories(rows);
          setCategoriesError('');
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setCategoriesError(messageOf(error));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
    let cancelled = false;
    requestList<Transaction>('/transactions')
      .then((body) => {
        if (!cancelled) {
          setItems(body.items);
          setTotal(body.total);
          setListError('');
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setListError(messageOf(error));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setListLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    let cancelled = false;
    setSummary(null);
    setSummaryError('');
    setSummaryLoading(true);
    const path =
      summaryDate === undefined
        ? '/income/summary'
        : `/income/summary?date=${encodeURIComponent(summaryDate)}`;
    request<DailyIncomeSummary>(path)
      .then((body) => {
        if (!cancelled) {
          setSummary(body);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setSummaryError(messageOf(error));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setSummaryLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [summaryDate, reloadKey]);

  useEffect(() => {
    if (receiptKey === '') {
      return;
    }
    let cancelled = false;
    const ids = receiptKey.split(',').map((value) => Number(value));
    for (const id of ids) {
      request<ReceiptUrl>(`/transactions/${id}/receipt`)
        .then((receipt) => {
          if (!cancelled) {
            setPhotos((current) => ({
              ...current,
              [id]: { url: receipt.url, contentType: receipt.contentType },
            }));
            setRowErrors((current) => {
              if (!Object.hasOwn(current, id)) {
                return current;
              }
              const next = { ...current };
              delete next[id];
              return next;
            });
          }
        })
        .catch((error: unknown) => {
          if (!cancelled) {
            setRowErrors((current) => ({ ...current, [id]: messageOf(error) }));
          }
        });
    }
    return () => {
      cancelled = true;
    };
  }, [receiptKey]);

  function clearEntry() {
    setNote('');
    setOccurredOn('');
    setAmount('');
    setMiles('');
    setPickedSlug('');
    setPickedNote(null);
    setMassageType('');
    setCustomMassageType('');
    setParty('');
    setHours('');
    setFee('');
    setBonus('');
    if (receiptRef.current !== null) {
      receiptRef.current.value = '';
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');
    const payload: EntryPayload = { type };
    const trimmedNote = note.trim();
    if (trimmedNote !== '') {
      payload.note = trimmedNote;
    }
    if (summaryDate !== undefined) {
      payload.occurredOn = summaryDate;
    }

    if (type === 'expense') {
      if (categorySlug !== '') {
        payload.categorySlug = categorySlug;
      }
      if (mileage) {
        const milesValue = readWholeNumber(miles);
        if (!milesValue.ok) {
          setFormError(milesValue.message);
          return;
        }
        if (milesValue.value !== undefined) {
          payload.miles = milesValue.value;
        }
      } else {
        const money = readMoneyText(amount);
        if (!money.ok) {
          setFormError(money.message);
          return;
        }
        if (money.amountPence > 0) {
          payload.amountPence = money.amountPence;
        }
      }
    } else if (massageType === 'cash') {
      const money = readMoneyText(amount);
      if (!money.ok) {
        setFormError(money.message);
        return;
      }
      if (money.amountPence > 0) {
        payload.amountPence = money.amountPence;
      }
    } else if (!isMassageType(massageType)) {
      setFormError('Choose a massage type.');
      return;
    } else {
      payload.massageType = massageType;
      const chosen = chosenParty(party);
      if (chosen.workplaceId === undefined && chosen.clientId === undefined) {
        setFormError('Choose a workplace or a client.');
        return;
      }
      if (chosen.workplaceId !== undefined) {
        payload.workplaceId = chosen.workplaceId;
      }
      if (chosen.clientId !== undefined) {
        payload.clientId = chosen.clientId;
      }
      if (massageType === 'other') {
        const custom = customMassageType.trim();
        if (custom !== '') {
          payload.customMassageType = custom;
        }
      }
      const rated = rateOf(party, workplaces, clients);
      if (rated === null || rated.hourRatePence < 1) {
        setFormError('Set an hour rate under Workplaces.');
        return;
      }
      const parsedHours = readHours(hours);
      if (!parsedHours.ok) {
        setFormError(parsedHours.message);
        return;
      }
      if (parsedHours.minutes === undefined || parsedHours.minutes < 1) {
        setFormError('Enter hours.');
        return;
      }
      payload.minutes = parsedHours.minutes;
      const feeAmount = readOptionalMoney(fee);
      if (!feeAmount.ok) {
        setFormError(feeAmount.message);
        return;
      }
      if (feeAmount.amountPence !== undefined) {
        payload.additionalFeePence = feeAmount.amountPence;
      }
      const bonusAmount = readOptionalMoney(bonus);
      if (!bonusAmount.ok) {
        setFormError(bonusAmount.message);
        return;
      }
      if (bonusAmount.amountPence !== undefined) {
        payload.bonusPence = bonusAmount.amountPence;
      }
    }

    const receiptFile =
      type === 'expense' ? (receiptRef.current?.files?.item(0) ?? undefined) : undefined;
    if (receiptFile !== undefined && receiptFile.size > MAX_RECEIPT_BYTES) {
      setFormError(RECEIPT_FILE_MESSAGE);
      return;
    }

    setSaving(true);
    try {
      const created = await request<Transaction>('/transactions', {
        method: 'POST',
        json: payload,
      });
      let receiptError = '';
      if (receiptFile !== undefined) {
        const formData = new FormData();
        formData.append('file', receiptFile);
        try {
          await request(`/transactions/${created.id}/receipt`, {
            method: 'POST',
            formData,
          });
        } catch (error: unknown) {
          receiptError = messageOf(error);
        }
      }
      clearEntry();
      setReloadKey((value) => value + 1);
      if (receiptError !== '') {
        setFormError(receiptError);
      }
      noteRef.current?.focus();
    } catch (error: unknown) {
      setFormError(messageOf(error));
    } finally {
      setSaving(false);
    }
  }

  async function showMoreEntries() {
    setLoadingMore(true);
    setListError('');
    try {
      const body = await requestList<Transaction>('/transactions', items.length);
      setItems((current) => [...current, ...body.items]);
      setTotal(body.total);
    } catch (error: unknown) {
      setListError(messageOf(error));
    } finally {
      setLoadingMore(false);
    }
  }

  const parsedHours = readHours(hours);
  const rated = massage ? rateOf(party, workplaces, clients) : null;
  const draft = massageDraft(
    massage,
    massageType,
    customMassageType,
    parsedHours,
    rated,
    fee,
    bonus,
  );
  const hourHint = massage ? hourPreview(parsedHours, rated, massageType, customMassageType) : '';

  return (
    <div className="stack feed-page">
      <div>
        <h2>Log</h2>
        <p className="muted">
          {practiceTypeLabel(user.practiceType)} · {expenseMethodLabel(user.expenseMethod)}
        </p>
      </div>
      <section className="stack">
        <h3>Daily summary{summary === null ? '' : ` · ${summary.date}`}</h3>
        {summaryLoading ? <p className="muted">Loading summary…</p> : null}
        {summaryError !== '' ? <FormError message={summaryError} /> : null}
        {summary !== null && summaryError === '' ? (
          <SummaryFigures summary={shownSummary(summary, draft)} />
        ) : null}
      </section>
      <div className="feed-layout">
      <div className="card stack">
        <form ref={formRef} className="stack" autoComplete="off" onSubmit={onSubmit}>
          <fieldset className="segment">
            <legend className="sr-only">Type</legend>
            <div className="inline-choices">
              <label className="choice">
                <input
                  type="radio"
                  name="entryType"
                  value="income"
                  checked={type === 'income'}
                  onChange={() => {
                    setType('income');
                  }}
                />
                Income
              </label>
              <label className="choice">
                <input
                  type="radio"
                  name="entryType"
                  value="expense"
                  checked={type === 'expense'}
                  onChange={() => {
                    setType('expense');
                    setEditingId(null);
                  }}
                />
                Expense
              </label>
            </div>
          </fieldset>
          <label className="field">
            Date
            <input
              type="date"
              value={occurredOn}
              onChange={(event) => {
                setOccurredOn(event.target.value);
              }}
            />
            <span className="muted">Leave blank for today.</span>
          </label>
          {type === 'income' ? (
            <label className="field">
              Massage Type
              <select
                value={massageType}
                onChange={(event) => {
                  const value = event.target.value;
                  if (value === '' || value === 'cash' || isMassageType(value)) {
                    setMassageType(value);
                  }
                }}
              >
                <option value="">Massage Type</option>
                {MASSAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
                <option value="cash">Cash income</option>
              </select>
            </label>
          ) : (
            <label className="field">
              Category
              <select
                value={categorySlug}
                disabled={categories === null}
                onChange={(event) => {
                  setPickedSlug(event.target.value);
                  setPickedNote(note);
                }}
              >
                <option value="">Choose a category</option>
                {allowed.map((category) => (
                  <option key={category.slug} value={category.slug}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {massage ? (
            <div className="subcard">
              <label className="field">
                Workplace or client
                <select
                  value={party}
                  onChange={(event) => {
                    setParty(event.target.value);
                  }}
                >
                  <option value="">Choose</option>
                  <optgroup label="Workplaces">
                    {workplaces.map((workplace) => (
                      <option key={`workplace-${workplace.id}`} value={`workplace:${workplace.id}`}>
                        {workplace.name}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Clients">
                    {clients.map((client) => (
                      <option key={`client-${client.id}`} value={`client:${client.id}`}>
                        {client.name}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </label>
              {workplacesLoading ? <p className="muted">Loading workplaces…</p> : null}
              {clientsLoading ? <p className="muted">Loading clients…</p> : null}
              <FormError message={directoryError} />
              {massageType === 'other' ? (
                <label className="field">
                  Massage type name
                  <input
                    value={customMassageType}
                    maxLength={100}
                    onChange={(event) => {
                      setCustomMassageType(event.target.value);
                    }}
                  />
                </label>
              ) : null}
              <label className="field">
                Hours
                <input
                  inputMode="decimal"
                  value={hours}
                  onChange={(event) => {
                    setHours(event.target.value);
                  }}
                />
                <span className="muted">{hourHint}</span>
              </label>
              <MoneyField
                label="Additional Massage Fee"
                value={fee}
                onChange={setFee}
                hint="Leave empty when nothing was received."
              />
              <MoneyField
                label="Bonus"
                value={bonus}
                onChange={setBonus}
                hint="Leave empty when nothing was received."
              />
            </div>
          ) : null}
          {type === 'expense' && mileage ? (
            <label className="field">
              Miles
              <input
                inputMode="numeric"
                value={miles}
                onChange={(event) => {
                  setMiles(event.target.value);
                }}
              />
              <span className="muted">Enter miles. The amount is calculated for you.</span>
            </label>
          ) : null}
          {type === 'expense' && !mileage ? (
            <MoneyField label="Amount" value={amount} onChange={setAmount} />
          ) : null}
          {massageType === 'cash' ? (
            <MoneyField label="Amount" value={amount} onChange={setAmount} />
          ) : null}
          <label className="field">
            Note
            <input
              ref={noteRef}
              value={note}
              maxLength={500}
              autoFocus
              onChange={(event) => {
                setNote(event.target.value);
              }}
            />
          </label>
          {type === 'expense' && suggestion !== null ? (
            <p className="hint" aria-live="polite">
              Suggested: {suggestion.name}
            </p>
          ) : null}
          {type === 'expense' ? (
            <label className="field">
              Attach a photo
              <input
                ref={receiptRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
              />
              <span className="muted">JPEG, PNG, WebP, or PDF.</span>
            </label>
          ) : null}
          <FormError message={formError} />
          <FormError message={categoriesError} />
          <button
            className="button-primary"
            type="submit"
            disabled={saving || (type === 'expense' && categories === null)}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </form>
      </div>
      <section className="stack">
        <h3>Entries</h3>
        <FormError message={listError} />
        {listLoading && items.length === 0 ? <p className="muted">Loading entries…</p> : null}
        {!listLoading && listError === '' && visibleItems.length === 0 ? (
          <div className="empty card">
            <p>Nothing logged yet.</p>
            <p className="muted">Record a session or an expense to start the log.</p>
            <button
              className="button-primary"
              type="button"
              onClick={() => {
                formRef.current?.scrollIntoView({ block: 'start' });
                noteRef.current?.focus();
              }}
            >
              Log an entry
            </button>
          </div>
        ) : null}
        <div className="list">
        {visibleItems.map((item) =>
          editingId === item.id && item.type === 'income' ? (
            <IncomeEditForm
              key={item.id}
              item={item}
              workplaces={workplaces}
              clients={clients}
              workplacesLoading={workplacesLoading}
              clientsLoading={clientsLoading}
              directoryError={directoryError}
              onCancel={() => {
                setEditingId(null);
              }}
              onSaved={() => {
                setEditingId(null);
                setReloadKey((value) => value + 1);
              }}
            />
          ) : (
            <TransactionRow
              key={item.id}
              item={item}
              categories={categories ?? []}
              workplaces={workplaces}
              clients={clients}
              photo={storedValue(photos, item.id)}
              error={storedValue(rowErrors, item.id) ?? ''}
              onDeleted={() => {
                setEditingId(null);
                setReloadKey((value) => value + 1);
              }}
              onEdit={
                item.type === 'income' && item.invoiceId === undefined
                  ? () => {
                      setEditingId(item.id);
                    }
                  : undefined
              }
            />
          ),
        )}
        </div>
        {total > items.length ? (
          <button
            className="button-ghost"
            type="button"
            disabled={loadingMore}
            onClick={() => {
              void showMoreEntries();
            }}
          >
            {loadingMore ? 'Loading…' : `Show more (${items.length} of ${total})`}
          </button>
        ) : null}
      </section>
      </div>
    </div>
  );
}

function MoneyField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <span className="money-input">
        <span className="money-prefix" aria-hidden="true">
          £
        </span>
        <input
          id={id}
          inputMode="decimal"
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
          }}
        />
      </span>
      {hint === undefined ? null : <span className="muted">{hint}</span>}
    </div>
  );
}

function SummaryFigures({ summary }: { summary: DailyIncomeSummary }) {
  return (
    <>
      <div className="card">
        <p className="muted">Daily total</p>
        <p className="hero-amount">{formatPounds(summary.totalPence)}</p>
      </div>
      <div className="stat-strip">
        <div className="stat">
          <span className="muted">Base</span>
          <strong>{formatPounds(summary.basePence)}</strong>
        </div>
        <div className="stat">
          <span className="muted">Additional fees</span>
          <strong>{formatPounds(summary.additionalFeePence)}</strong>
        </div>
        <div className="stat">
          <span className="muted">Bonus</span>
          <strong>{formatPounds(summary.bonusPence)}</strong>
        </div>
      </div>
      <p className="muted">
        These amounts stay on the feed. They are not included in the tax summary until the invoice is paid.
      </p>
      {summary.byWorkplace.length === 0 ? null : (
        <div className="stack">
          <h3>By workplace</h3>
          <ul className="parts">
            {summary.byWorkplace.map((row) => (
              <li className="directory-row" key={row.workplaceId}>
                <span>
                  {row.name}
                  <span className="muted"> · {workplaceLine(row)}</span>
                </span>
                <span className="amount">{formatPounds(row.totalPence)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {summary.byMassageType.length === 0 ? null : (
        <div className="stack">
          <h3>By massage type</h3>
          <ul className="parts">
            {summary.byMassageType.map((row) => (
              <li
                className="directory-row"
                key={`${row.massageType}:${row.customMassageType ?? ''}`}
              >
                <span>
                  {massageTypeLabel(row.massageType, row.customMassageType)}
                  <span className="muted"> · {massageLine(row)}</span>
                </span>
                <span className="amount">{formatPounds(row.totalPence)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

function workplaceLine(row: WorkplaceDay): string {
  const kind = row.kind === 'spa' ? 'Spa' : 'Clinic';
  return `${kind} · base ${formatPounds(row.basePence)} · additional fees ${formatPounds(row.additionalFeePence)} · bonus ${formatPounds(row.bonusPence)}`;
}

function massageLine(row: MassageTypeDay): string {
  return `base ${formatPounds(row.basePence)} · additional fees ${formatPounds(row.additionalFeePence)} · bonus ${formatPounds(row.bonusPence)}`;
}

function TransactionRow({
  item,
  categories,
  workplaces,
  clients,
  photo,
  error,
  onDeleted,
  onEdit,
}: {
  item: Transaction;
  categories: readonly ExpenseCategory[];
  workplaces: readonly Workplace[];
  clients: readonly Client[];
  photo: ShownReceipt | undefined;
  error: string;
  onDeleted: () => void;
  onEdit: (() => void) | undefined;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const label = item.categorySlug === undefined ? null : categoryName(categories, item.categorySlug);

  async function removeEntry() {
    setDeleting(true);
    setDeleteError('');
    try {
      await request<void>(`/transactions/${item.id}`, { method: 'DELETE' });
      onDeleted();
    } catch (caught: unknown) {
      setDeleteError(messageOf(caught));
      setDeleting(false);
    }
  }
  const named = partyName(item, workplaces, clients);
  const detail = entryDetail(item);
  return (
    <article className={item.type === 'income' ? 'entry income' : 'entry expense'}>
      <div className="entry-main">
        <p className="muted">
          {item.occurredOn} · {item.type === 'income' ? 'Income' : 'Expense'}
          {label === null ? '' : ` · ${label}`}
        </p>
        {item.note !== undefined ? <p className="note">{item.note}</p> : null}
        {named === null ? null : <p>{named}</p>}
        {detail === null ? null : <p className="muted">{detail}</p>}
        {item.hasReceipt ? (
          photo === undefined ? (
            <p className="muted">Loading photo…</p>
          ) : photo.contentType === 'application/pdf' ? (
            <a href={photo.url} target="_blank" rel="noreferrer">
              View PDF
            </a>
          ) : (
            <img className="receipt" src={photo.url} alt="Receipt" />
          )
        ) : null}
        <FormError message={error} />
        <FormError message={deleteError} />
        {confirmingDelete ? (
          <div className="actions">
            <button className="button-ghost" type="button" disabled={deleting} onClick={() => void removeEntry()}>
              {deleting ? 'Deleting…' : 'Delete entry'}
            </button>
            <button
              className="button-ghost"
              type="button"
              disabled={deleting}
              onClick={() => {
                setConfirmingDelete(false);
              }}
            >
              Cancel
            </button>
          </div>
        ) : onEdit !== undefined || item.invoiceId === undefined ? (
          <div className="actions">
            {onEdit === undefined ? null : (
              <button className="button-ghost" type="button" onClick={onEdit}>
                Edit
              </button>
            )}
            {item.invoiceId === undefined ? (
              <button
                className="button-ghost"
                type="button"
                onClick={() => {
                  setConfirmingDelete(true);
                }}
              >
                Delete
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      <p className="amount">{formatPounds(item.amountPence)}</p>
    </article>
  );
}

function entryDetail(item: Transaction): string | null {
  if (item.massageType !== undefined) {
    const name = massageTypeLabel(item.massageType, item.customMassageType);
    const hours = item.minutes === undefined ? 'Base' : hoursLabel(item.minutes);
    return `${name} · ${hours} · fee ${formatPounds(item.additionalFeePence ?? 0)} · bonus ${formatPounds(item.bonusPence ?? 0)}`;
  }
  if (item.miles !== undefined) {
    return `${item.miles} miles`;
  }
  return null;
}

function IncomeEditForm({
  item,
  workplaces,
  clients,
  workplacesLoading,
  clientsLoading,
  directoryError,
  onCancel,
  onSaved,
}: {
  item: Transaction;
  workplaces: readonly Workplace[];
  clients: readonly Client[];
  workplacesLoading: boolean;
  clientsLoading: boolean;
  directoryError: string;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const massage = item.massageType !== undefined;
  const [occurredOn, setOccurredOn] = useState(inputDateFromCivil(item.occurredOn));
  const [note, setNote] = useState(item.note ?? '');
  const [massageType, setMassageType] = useState<MassageType | ''>(item.massageType ?? '');
  const [customMassageType, setCustomMassageType] = useState(item.customMassageType ?? '');
  const [party, setParty] = useState(partyValue(item));
  const [hours, setHours] = useState(item.minutes === undefined ? '' : formatHours(item.minutes));
  const [fee, setFee] = useState(optionalMoneyInput(item.additionalFeePence));
  const [bonus, setBonus] = useState(optionalMoneyInput(item.bonusPence));
  const [amount, setAmount] = useState(formatMoneyInput(item.amountPence));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const parsedHours = readHours(hours);
  const rated = massage ? rateOf(party, workplaces, clients) : null;
  const hourHint = massage ? hourPreview(parsedHours, rated, massageType, customMassageType) : '';

  async function save() {
    setError('');
    const date = civilDateFromInput(occurredOn);
    if (date === undefined) {
      setError('Enter a date.');
      return;
    }
    const trimmedNote = note.trim();
    const payload: IncomePatch = {
      occurredOn: date,
      note: trimmedNote === '' ? null : trimmedNote,
    };
    if (!massage) {
      const money = readMoneyText(amount);
      if (!money.ok) {
        setError(money.message);
        return;
      }
      if (money.amountPence < 1) {
        setError('Amount is required');
        return;
      }
      payload.amountPence = money.amountPence;
    } else if (!isMassageType(massageType)) {
      setError('Choose a massage type.');
      return;
    } else {
      payload.massageType = massageType;
      const chosen = chosenParty(party);
      if (chosen.workplaceId !== undefined) {
        payload.workplaceId = chosen.workplaceId;
        payload.clientId = null;
      } else if (chosen.clientId !== undefined) {
        payload.clientId = chosen.clientId;
        payload.workplaceId = null;
      } else {
        setError('Choose a workplace or a client.');
        return;
      }
      if (massageType === 'other') {
        const custom = customMassageType.trim();
        if (custom === '') {
          setError('Custom massage type is required');
          return;
        }
        payload.customMassageType = custom;
      } else {
        payload.customMassageType = null;
      }
      if (rated === null || rated.hourRatePence < 1) {
        setError('Set an hour rate under Workplaces.');
        return;
      }
      if (!parsedHours.ok) {
        setError(parsedHours.message);
        return;
      }
      if (parsedHours.minutes === undefined || parsedHours.minutes < 1) {
        setError('Enter hours.');
        return;
      }
      payload.minutes = parsedHours.minutes;
      const feeAmount = readOptionalMoney(fee);
      if (!feeAmount.ok) {
        setError(feeAmount.message);
        return;
      }
      payload.additionalFeePence = feeAmount.amountPence ?? 0;
      const bonusAmount = readOptionalMoney(bonus);
      if (!bonusAmount.ok) {
        setError(bonusAmount.message);
        return;
      }
      payload.bonusPence = bonusAmount.amountPence ?? 0;
    }
    setSaving(true);
    try {
      await request<Transaction>(`/transactions/${item.id}`, { method: 'PATCH', json: payload });
      onSaved();
    } catch (caught: unknown) {
      setError(messageOf(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="row income">
      <form
        className="stack"
        autoComplete="off"
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <label className="field">
          Date
          <input
            type="date"
            value={occurredOn}
            onChange={(event) => {
              setOccurredOn(event.target.value);
            }}
          />
        </label>
        {massage ? (
          <>
            <label className="field">
              Massage Type
              <select
                value={massageType}
                onChange={(event) => {
                  const value = event.target.value;
                  if (isMassageType(value)) {
                    setMassageType(value);
                  }
                }}
              >
                {MASSAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Workplace or client
              <select
                value={party}
                onChange={(event) => {
                  setParty(event.target.value);
                }}
              >
                <option value="">Choose</option>
                <optgroup label="Workplaces">
                  {workplaces.map((workplace) => (
                    <option key={`workplace-${workplace.id}`} value={`workplace:${workplace.id}`}>
                      {workplace.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Clients">
                  {clients.map((client) => (
                    <option key={`client-${client.id}`} value={`client:${client.id}`}>
                      {client.name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </label>
            {workplacesLoading ? <p className="muted">Loading workplaces…</p> : null}
            {clientsLoading ? <p className="muted">Loading clients…</p> : null}
            <FormError message={directoryError} />
            {massageType === 'other' ? (
              <label className="field">
                Massage type name
                <input
                  value={customMassageType}
                  maxLength={100}
                  onChange={(event) => {
                    setCustomMassageType(event.target.value);
                  }}
                />
              </label>
            ) : null}
            <label className="field">
              Hours
              <input
                inputMode="decimal"
                value={hours}
                onChange={(event) => {
                  setHours(event.target.value);
                }}
              />
              <span className="muted">{hourHint}</span>
            </label>
            <MoneyField
              label="Additional Massage Fee"
              value={fee}
              onChange={setFee}
              hint="Leave empty when nothing was received."
            />
            <MoneyField
              label="Bonus"
              value={bonus}
              onChange={setBonus}
              hint="Leave empty when nothing was received."
            />
          </>
        ) : (
          <MoneyField label="Amount" value={amount} onChange={setAmount} />
        )}
        <label className="field">
          Note
          <input
            value={note}
            maxLength={500}
            onChange={(event) => {
              setNote(event.target.value);
            }}
          />
        </label>
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
    </article>
  );
}

function inputDateFromCivil(value: string): string {
  const parts = value.split('-');
  if (parts.length !== 3) {
    return '';
  }
  const [day, month, year] = parts;
  if (
    day === undefined ||
    month === undefined ||
    year === undefined ||
    !/^\d{2}$/.test(day) ||
    !/^\d{2}$/.test(month) ||
    !/^\d{4}$/.test(year)
  ) {
    return '';
  }
  return `${year}-${month}-${day}`;
}

function partyValue(item: Transaction): string {
  if (item.workplaceId !== undefined) {
    return `workplace:${item.workplaceId}`;
  }
  if (item.clientId !== undefined) {
    return `client:${item.clientId}`;
  }
  return '';
}

function partyName(
  item: Transaction,
  workplaces: readonly Workplace[],
  clients: readonly Client[],
): string | null {
  if (item.workplaceId !== undefined) {
    const workplace = workplaces.find((row) => row.id === item.workplaceId);
    if (workplace === undefined) {
      return null;
    }
    return `${workplace.name} · ${workplace.kind === 'spa' ? 'Spa' : 'Clinic'}`;
  }
  if (item.clientId !== undefined) {
    const client = clients.find((row) => row.id === item.clientId);
    return client === undefined ? null : client.name;
  }
  return null;
}

function rateOf(
  party: string,
  workplaces: readonly Workplace[],
  clients: readonly Client[],
): { hourRatePence: number; hourExtras: Workplace['hourExtras'] } | null {
  const chosen = chosenParty(party);
  if (chosen.workplaceId !== undefined) {
    const workplace = workplaces.find((row) => row.id === chosen.workplaceId);
    if (workplace === undefined) {
      return null;
    }
    return {
      hourRatePence: workplace.hourRatePence,
      hourExtras: workplace.hourExtras,
    };
  }
  if (chosen.clientId !== undefined) {
    const client = clients.find((row) => row.id === chosen.clientId);
    if (client === undefined) {
      return null;
    }
    return {
      hourRatePence: client.hourRatePence,
      hourExtras: client.hourExtras,
    };
  }
  return null;
}

function hourPreview(
  parsedHours: { ok: true; minutes: number | undefined } | { ok: false; message: string },
  rated: { hourRatePence: number; hourExtras: Workplace['hourExtras'] } | null,
  massageType: string,
  customMassageType: string,
): string {
  if (!parsedHours.ok) {
    return parsedHours.message;
  }
  if (parsedHours.minutes === undefined) {
    return '';
  }
  if (rated === null || rated.hourRatePence < 1) {
    return 'Set an hour rate under Workplaces.';
  }
  const rate = effectiveHourRatePence(
    rated.hourRatePence,
    rated.hourExtras,
    massageType,
    customMassageType,
  );
  const base = basePenceFromMinutes(parsedHours.minutes, rate);
  return `${hoursLabel(parsedHours.minutes)} × ${formatPounds(rate)} = ${formatPounds(base)}`;
}

function massageDraft(
  massage: boolean,
  massageType: string,
  customMassageType: string,
  parsedHours: { ok: true; minutes: number | undefined } | { ok: false; message: string },
  rated: { hourRatePence: number; hourExtras: Workplace['hourExtras'] } | null,
  feeText: string,
  bonusText: string,
): { basePence: number; additionalFeePence: number; bonusPence: number } | null {
  if (!massage || !parsedHours.ok || parsedHours.minutes === undefined || parsedHours.minutes < 1) {
    return null;
  }
  if (rated === null || rated.hourRatePence < 1) {
    return null;
  }
  const feeAmount = readOptionalMoney(feeText);
  const bonusAmount = readOptionalMoney(bonusText);
  return {
    basePence: basePenceFromMinutes(
      parsedHours.minutes,
      effectiveHourRatePence(rated.hourRatePence, rated.hourExtras, massageType, customMassageType),
    ),
    additionalFeePence: feeAmount.ok ? (feeAmount.amountPence ?? 0) : 0,
    bonusPence: bonusAmount.ok ? (bonusAmount.amountPence ?? 0) : 0,
  };
}

function optionalMoneyInput(amountPence: number | undefined): string {
  if (amountPence === undefined || amountPence === 0) {
    return '';
  }
  return formatMoneyInput(amountPence);
}

function shownSummary(
  summary: DailyIncomeSummary,
  draft: { basePence: number; additionalFeePence: number; bonusPence: number } | null,
): DailyIncomeSummary {
  const draftBase = draft === null ? 0 : draft.basePence;
  const draftFee = draft === null ? 0 : draft.additionalFeePence;
  const draftBonus = draft === null ? 0 : draft.bonusPence;
  return {
    ...summary,
    basePence: summary.basePence + draftBase,
    additionalFeePence: summary.additionalFeePence + draftFee,
    bonusPence: summary.bonusPence + draftBonus,
    totalPence: summary.totalPence + draftBase + draftFee + draftBonus,
  };
}

function chosenParty(value: string): { workplaceId?: number; clientId?: number } {
  const workplace = /^workplace:(\d+)$/.exec(value);
  if (workplace?.[1] !== undefined) {
    return { workplaceId: Number(workplace[1]) };
  }
  const client = /^client:(\d+)$/.exec(value);
  if (client?.[1] !== undefined) {
    return { clientId: Number(client[1]) };
  }
  return {};
}

function storedValue<T>(record: Record<number, T>, id: number): T | undefined {
  if (!Object.hasOwn(record, id)) {
    return undefined;
  }
  return record[id];
}
