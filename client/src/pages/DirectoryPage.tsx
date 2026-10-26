import { useEffect, useState } from 'react';
import { messageOf, request } from '../api.ts';
import { insertByName, SaveClientForm, SaveWorkplaceForm } from '../directory-forms.tsx';
import { formatPounds } from '../format.ts';
import { FormError } from '../FormError.tsx';
import type { Client, ListResponse, Workplace } from '../types.ts';

function rateText(hourRatePence: number, pregnancyExtraPence: number): string {
  const rate = `${formatPounds(hourRatePence)}/hour`;
  if (pregnancyExtraPence > 0) {
    return `${rate} · pregnancy +${formatPounds(pregnancyExtraPence)}/hour`;
  }
  return rate;
}

export function DirectoryPage() {
  const [workplaces, setWorkplaces] = useState<Workplace[]>([]);
  const [workplaceTotal, setWorkplaceTotal] = useState(0);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientTotal, setClientTotal] = useState(0);
  const [workplacesLoading, setWorkplacesLoading] = useState(true);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [workplacesError, setWorkplacesError] = useState('');
  const [clientsError, setClientsError] = useState('');

  useEffect(() => {
    let cancelled = false;
    request<ListResponse<Workplace>>('/workplaces?limit=100')
      .then((body) => {
        if (!cancelled) {
          setWorkplaces(body.items);
          setWorkplaceTotal(body.total);
          setWorkplacesError('');
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setWorkplacesError(messageOf(error));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setWorkplacesLoading(false);
        }
      });
    request<ListResponse<Client>>('/clients?limit=100')
      .then((body) => {
        if (!cancelled) {
          setClients(body.items);
          setClientTotal(body.total);
          setClientsError('');
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setClientsError(messageOf(error));
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

  return (
    <div className="stack">
      <h2>Workplace name</h2>
      <section className="card stack">
        <h3>Workplaces</h3>
        {workplacesLoading ? <p className="muted">Loading workplaces…</p> : null}
        <FormError message={workplacesError} />
        {!workplacesLoading && workplacesError === '' && workplaces.length === 0 ? (
          <p className="muted">No workplaces saved yet.</p>
        ) : null}
        {workplaceTotal > workplaces.length ? (
          <p className="muted">
            Showing {workplaces.length} of {workplaceTotal}.
          </p>
        ) : null}
        <div className="list">
          {workplaces.map((workplace) => (
            <p key={workplace.id}>
              {workplace.name} · {workplace.kind === 'spa' ? 'Spa' : 'Clinic'} ·{' '}
              {rateText(workplace.hourRatePence, workplace.pregnancyExtraPence)}
            </p>
          ))}
        </div>
        <SaveWorkplaceForm
          onCreated={(workplace) => {
            setWorkplaces((current) => insertByName(current, workplace));
            setWorkplaceTotal((current) => current + 1);
          }}
        />
      </section>
      <section className="card stack">
        <h3>Clients</h3>
        {clientsLoading ? <p className="muted">Loading clients…</p> : null}
        <FormError message={clientsError} />
        {!clientsLoading && clientsError === '' && clients.length === 0 ? (
          <p className="muted">No clients saved yet.</p>
        ) : null}
        {clientTotal > clients.length ? (
          <p className="muted">
            Showing {clients.length} of {clientTotal}.
          </p>
        ) : null}
        <div className="list">
          {clients.map((client) => (
            <p key={client.id}>
              {client.name} · {rateText(client.hourRatePence, client.pregnancyExtraPence)}
            </p>
          ))}
        </div>
        <SaveClientForm
          onCreated={(client) => {
            setClients((current) => insertByName(current, client));
            setClientTotal((current) => current + 1);
          }}
        />
      </section>
    </div>
  );
}
