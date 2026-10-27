import { useEffect, useState } from 'react';
import { formatAddress } from '../address.ts';
import { messageOf, request } from '../api.ts';
import {
  EditClientForm,
  EditWorkplaceForm,
  insertByName,
  replaceByName,
  SaveClientForm,
  SaveWorkplaceForm,
} from '../directory-forms.tsx';
import { formatRateText } from '../format.ts';
import { FormError } from '../FormError.tsx';
import type { Client, ListResponse, Workplace } from '../types.ts';

export function DirectoryPage() {
  const [workplaces, setWorkplaces] = useState<Workplace[]>([]);
  const [workplaceTotal, setWorkplaceTotal] = useState(0);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientTotal, setClientTotal] = useState(0);
  const [workplacesLoading, setWorkplacesLoading] = useState(true);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [workplacesError, setWorkplacesError] = useState('');
  const [clientsError, setClientsError] = useState('');
  const [editingWorkplaceId, setEditingWorkplaceId] = useState<number | null>(null);
  const [editingClientId, setEditingClientId] = useState<number | null>(null);

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
      <h2>Workplaces</h2>
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
          {workplaces.map((workplace) =>
            editingWorkplaceId === workplace.id ? (
              <EditWorkplaceForm
                key={workplace.id}
                workplace={workplace}
                onSaved={(updated) => {
                  setWorkplaces((current) => replaceByName(current, updated));
                  setEditingWorkplaceId(null);
                }}
                onCancel={() => {
                  setEditingWorkplaceId(null);
                }}
              />
            ) : (
              <div key={workplace.id} className="directory-row">
                <p>
                  {workplace.name} · {workplace.kind === 'spa' ? 'Spa' : 'Clinic'} ·{' '}
                  {formatRateText(workplace.hourRatePence, workplace.hourExtras)}
                </p>
                <p className="muted">{formatAddress(workplace) || 'No address yet'}</p>
                <button
                  className="button-ghost"
                  type="button"
                  onClick={() => {
                    setEditingWorkplaceId(workplace.id);
                  }}
                >
                  Edit
                </button>
              </div>
            ),
          )}
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
          {clients.map((client) =>
            editingClientId === client.id ? (
              <EditClientForm
                key={client.id}
                client={client}
                onSaved={(updated) => {
                  setClients((current) => replaceByName(current, updated));
                  setEditingClientId(null);
                }}
                onCancel={() => {
                  setEditingClientId(null);
                }}
              />
            ) : (
              <div key={client.id} className="directory-row">
                <p>
                  {client.name} · {formatRateText(client.hourRatePence, client.hourExtras)}
                </p>
                <p className="muted">{formatAddress(client) || 'No address yet'}</p>
                <button
                  className="button-ghost"
                  type="button"
                  onClick={() => {
                    setEditingClientId(client.id);
                  }}
                >
                  Edit
                </button>
              </div>
            ),
          )}
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
