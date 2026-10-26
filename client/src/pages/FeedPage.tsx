import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { messageOf, request } from '../api.ts';
import { categoriesForMethod, categoryName } from '../category-filter.ts';
import { FormError } from '../FormError.tsx';
import {
  civilDateFromInput,
  expenseMethodLabel,
  formatPounds,
  practiceTypeLabel,
  readAmountPence,
  readWholeNumber,
} from '../format.ts';
import { suggestCategory } from '../hint.ts';
import type {
  ExpenseCategory,
  ListResponse,
  ReadyUser,
  ReceiptUrl,
  Transaction,
} from '../types.ts';

interface FeedPageProps {
  user: ReadyUser;
}

export function FeedPage({ user }: FeedPageProps) {
  const [categories, setCategories] = useState<ExpenseCategory[] | null>(null);
  const [items, setItems] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [listLoading, setListLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [pageError, setPageError] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [note, setNote] = useState('');
  const [occurredOn, setOccurredOn] = useState('');
  const [pickedSlug, setPickedSlug] = useState('');
  const [pickedNote, setPickedNote] = useState<string | null>(null);
  const [miles, setMiles] = useState('');
  const [pounds, setPounds] = useState('');
  const [pence, setPence] = useState('');
  const [photos, setPhotos] = useState<Record<number, string>>({});
  const [rowErrors, setRowErrors] = useState<Record<number, string>>({});
  const noteRef = useRef<HTMLInputElement>(null);

  const allowed =
    categories === null
      ? []
      : categoriesForMethod(categories, user.expenseMethod);
  const suggestion = suggestCategory(allowed, note);
  const categorySlug =
    pickedNote === note ? pickedSlug : (suggestion?.slug ?? pickedSlug);
  const selected = allowed.find((category) => category.slug === categorySlug);
  const mileage = type === 'expense' && selected?.kind === 'mileage';
  const receiptKey = items
    .filter((item) => item.hasReceipt)
    .map((item) => item.id)
    .join(',');

  useEffect(() => {
    let cancelled = false;
    request<ExpenseCategory[]>('/expense-categories')
      .then((rows) => {
        if (!cancelled) {
          setCategories(rows);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setPageError(messageOf(error));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    request<ListResponse<Transaction>>('/transactions?limit=100')
      .then((body) => {
        if (!cancelled) {
          setItems(body.items);
          setTotal(body.total);
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
          setListLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

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
            setPhotos((current) => ({ ...current, [id]: receipt.url }));
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

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');
    const payload: {
      type: 'income' | 'expense';
      occurredOn?: string;
      note?: string;
      amountPence?: number;
      categorySlug?: string;
      miles?: number;
    } = { type };
    const trimmedNote = note.trim();
    if (trimmedNote !== '') {
      payload.note = trimmedNote;
    }
    const civil = civilDateFromInput(occurredOn);
    if (civil !== undefined) {
      payload.occurredOn = civil;
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
        const money = readAmountPence(pounds, pence);
        if (!money.ok) {
          setFormError(money.message);
          return;
        }
        if (money.amountPence > 0) {
          payload.amountPence = money.amountPence;
        }
      }
    } else {
      const money = readAmountPence(pounds, pence);
      if (!money.ok) {
        setFormError(money.message);
        return;
      }
      if (money.amountPence > 0) {
        payload.amountPence = money.amountPence;
      }
    }

    setSaving(true);
    try {
      await request('/transactions', { method: 'POST', json: payload });
      setNote('');
      setOccurredOn('');
      setPounds('');
      setPence('');
      setMiles('');
      setPickedSlug('');
      setPickedNote(null);
      setReloadKey((value) => value + 1);
      noteRef.current?.focus();
    } catch (error: unknown) {
      setFormError(messageOf(error));
    } finally {
      setSaving(false);
    }
  }

  async function onFile(transactionId: number, input: HTMLInputElement) {
    const file = input.files?.item(0) ?? undefined;
    input.value = '';
    if (file === undefined) {
      return;
    }
    setRowErrors((current) => {
      const next = { ...current };
      delete next[transactionId];
      return next;
    });
    const formData = new FormData();
    formData.append('file', file);
    try {
      await request(`/transactions/${transactionId}/receipt`, {
        method: 'POST',
        formData,
      });
      setItems((current) =>
        current.map((item) =>
          item.id === transactionId ? { ...item, hasReceipt: true } : item,
        ),
      );
    } catch (error: unknown) {
      setRowErrors((current) => ({
        ...current,
        [transactionId]: messageOf(error),
      }));
    }
  }

  return (
    <div className="stack">
      <div>
        <h2>Feed</h2>
        <p className="muted">
          {practiceTypeLabel(user.practiceType)} ·{' '}
          {expenseMethodLabel(user.expenseMethod)}
        </p>
      </div>
      <form className="card stack" autoComplete="off" onSubmit={onSubmit}>
        <fieldset>
          <legend>Type</legend>
          <div className="inline-choices">
            <label className="choice">
              <input
                type="radio"
                name="entryType"
                value="expense"
                checked={type === 'expense'}
                onChange={() => {
                  setType('expense');
                }}
              />
              Expense
            </label>
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
          </div>
        </fieldset>
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
        {type === 'expense' ? (
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
        ) : null}
        {mileage ? (
          <label className="field">
            Miles
            <input
              inputMode="numeric"
              value={miles}
              onChange={(event) => {
                setMiles(event.target.value);
              }}
            />
            <span className="muted">
              Enter miles. The amount is calculated for you.
            </span>
          </label>
        ) : (
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
        )}
        <FormError message={formError} />
        <button
          className="button-primary"
          type="submit"
          disabled={saving || (type === 'expense' && categories === null)}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </form>
      <FormError message={pageError} />
      {listLoading && items.length === 0 ? (
        <p className="muted">Loading entries…</p>
      ) : null}
      {!listLoading && pageError === '' && items.length === 0 ? (
        <p className="muted">No entries yet.</p>
      ) : null}
      {total > items.length ? (
        <p className="muted">
          Showing the latest {items.length} of {total}.
        </p>
      ) : null}
      <div className="list">
        {items.map((item) => (
          <TransactionRow
            key={item.id}
            item={item}
            categories={categories ?? []}
            photoUrl={storedValue(photos, item.id)}
            error={storedValue(rowErrors, item.id) ?? ''}
            onFile={onFile}
          />
        ))}
      </div>
    </div>
  );
}

function TransactionRow({
  item,
  categories,
  photoUrl,
  error,
  onFile,
}: {
  item: Transaction;
  categories: readonly ExpenseCategory[];
  photoUrl: string | undefined;
  error: string;
  onFile: (transactionId: number, input: HTMLInputElement) => void;
}) {
  const label =
    item.categorySlug === undefined
      ? null
      : categoryName(categories, item.categorySlug);
  return (
    <article className={item.type === 'income' ? 'row income' : 'row expense'}>
      <p className="muted">
        {item.occurredOn} · {item.type === 'income' ? 'Income' : 'Expense'}
        {label === null ? '' : ` · ${label}`}
      </p>
      {item.note !== undefined ? <p className="note">{item.note}</p> : null}
      {item.miles !== undefined ? (
        <p className="amount">
          {item.miles} miles · {formatPounds(item.amountPence)}
        </p>
      ) : (
        <p className="amount">{formatPounds(item.amountPence)}</p>
      )}
      {item.hasReceipt ? (
        photoUrl === undefined ? (
          <p className="muted">Loading photo…</p>
        ) : (
          <img className="receipt" src={photoUrl} alt="Receipt" />
        )
      ) : (
        <label className="field">
          Attach a photo
          <input
            type="file"
            onChange={(event) => {
              onFile(item.id, event.target);
            }}
          />
          <span className="muted">JPEG, PNG, or WebP.</span>
        </label>
      )}
      <FormError message={error} />
    </article>
  );
}

function storedValue(
  record: Record<number, string>,
  id: number,
): string | undefined {
  if (!Object.hasOwn(record, id)) {
    return undefined;
  }
  return record[id];
}
