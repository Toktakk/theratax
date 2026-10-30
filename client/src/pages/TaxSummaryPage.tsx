import { useEffect, useState } from 'react';
import { messageOf, request } from '../api.ts';
import { FormError } from '../FormError.tsx';
import { expenseMethodLabel, formatPounds } from '../format.ts';
import type { TaxSummary } from '../types.ts';

export function TaxSummaryPage() {
  const [summary, setSummary] = useState<TaxSummary | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    request<TaxSummary>('/tax/summary')
      .then((body) => {
        if (!cancelled) {
          setSummary(body);
        }
      })
      .catch((caught: unknown) => {
        if (!cancelled) {
          setError(messageOf(caught));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error !== '') {
    return (
      <div className="stack reading-page">
        <h2>Tax summary</h2>
        <FormError message={error} />
      </div>
    );
  }

  if (summary === null) {
    return (
      <div className="stack reading-page">
        <h2>Tax summary</h2>
        <p className="muted">Loading tax summary…</p>
      </div>
    );
  }

  return (
    <div className="stack reading-page">
      <h2>Tax summary</h2>
      <section className="card">
        <p className="muted">Estimated tax</p>
        <p className="hero-amount">{formatPounds(summary.estimatedTaxOwedPence)}</p>
        <p className="muted">
          {summary.periodStart} to {summary.periodEnd}
        </p>
      </section>
      <div className="stat-strip">
        <div className="stat">
          <span className="muted">Income</span>
          <strong className="income-value">{formatPounds(summary.incomePence)}</strong>
        </div>
        <div className="stat">
          <span className="muted">Allowable expenses</span>
          <strong className="expense-value">{formatPounds(summary.allowableExpensesPence)}</strong>
        </div>
        <div className="stat">
          <span className="muted">Net profit</span>
          <strong>
            {formatPounds(summary.netProfitPence)}
            {summary.netProfitPence < 0 ? ' (loss)' : ''}
          </strong>
        </div>
      </div>
      <dl className="figures card figures-quiet">
        <div>
          <dt>Vehicle method</dt>
          <dd>{expenseMethodLabel(summary.expenseMethod)}</dd>
        </div>
      </dl>
      <p>
        {summary.class2.treatedAsPaid
          ? 'Class 2 National Insurance is treated as paid.'
          : `Voluntary Class 2 is ${formatPounds(summary.class2.voluntaryWeeklyPence)} a week. This is not included in estimated tax.`}
      </p>
      <section className="stack">
        <h3>Assumptions</h3>
        <ol>
          {summary.assumptions.map((assumption) => (
            <li key={assumption}>{assumption}</li>
          ))}
        </ol>
      </section>
      <p className="disclaimer">{summary.disclaimer}</p>
    </div>
  );
}
