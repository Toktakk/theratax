import { useEffect, useState } from 'react';
import { formatAddress } from '../address.ts';
import { messageOf } from '../api.ts';
import {
  EditClientForm,
  EditWorkplaceForm,
  insertByName,
  replaceByName,
  SaveClientForm,
  SaveWorkplaceForm,
} from '../directory-forms.tsx';
import { compareHourExtras, formatPounds, massageTypeLabel } from '../format.ts';
import { FormError } from '../FormError.tsx';
import { requestList } from '../list-page.ts';
import type { Client, HourExtra, Workplace } from '../types.ts';

export function DirectoryPage() {
  const [workplaces, setWorkplaces] = useState<Workplace[]>([]);
  const [workplaceTotal, setWorkplaceTotal] = useState(0);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientTotal, setClientTotal] = useState(0);
  const [workplacesLoading, setWorkplacesLoading] = useState(true);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [loadingMoreWorkplaces, setLoadingMoreWorkplaces] = useState(false);
  const [loadingMoreClients, setLoadingMoreClients] = useState(false);
  const [workplacesError, setWorkplacesError] = useState('');
  const [clientsError, setClientsError] = useState('');
  const [editingWorkplaceId, setEditingWorkplaceId] = useState<number | null>(null);
  const [editingClientId, setEditingClientId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    requestList<Workplace>('/workplaces')
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
    requestList<Client>('/clients')
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

  async function showMoreWorkplaces() {
    setLoadingMoreWorkplaces(true);
    setWorkplacesError('');
    try {
      const body = await requestList<Workplace>('/workplaces', workplaces.length);
      setWorkplaces((current) => [...current, ...body.items]);
      setWorkplaceTotal(body.total);
    } catch (error: unknown) {
      setWorkplacesError(messageOf(error));
    } finally {
      setLoadingMoreWorkplaces(false);
    }
  }

  async function showMoreClients() {
    setLoadingMoreClients(true);
    setClientsError('');
    try {
      const body = await requestList<Client>('/clients', clients.length);
      setClients((current) => [...current, ...body.items]);
      setClientTotal(body.total);
    } catch (error: unknown) {
      setClientsError(messageOf(error));
    } finally {
      setLoadingMoreClients(false);
    }
  }

  return (
    <div className="stack directory-layout">
      <h2>Workplaces and clients</h2>
      <section className="card stack">
        <h3>Workplaces</h3>
        {workplacesLoading ? <p className="muted">Loading workplaces…</p> : null}
        <FormError message={workplacesError} />
        {!workplacesLoading && workplacesError === '' && workplaces.length === 0 ? (
          <p className="muted">No workplaces saved yet.</p>
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
              <div key={workplace.id} className="directory-row directory-entry">
                <div className="detail">
                  <p>
                    {workplace.name} · {workplace.kind === 'spa' ? 'Spa' : 'Clinic'}
                  </p>
                  <RateLines hourRatePence={workplace.hourRatePence} hourExtras={workplace.hourExtras} />
                  <p className="muted">{formatAddress(workplace) || 'No address yet'}</p>
                </div>
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
        {workplaceTotal > workplaces.length ? (
          <button
            className="button-ghost"
            type="button"
            disabled={loadingMoreWorkplaces}
            onClick={() => {
              void showMoreWorkplaces();
            }}
          >
            {loadingMoreWorkplaces
              ? 'Loading…'
              : `Show more (${workplaces.length} of ${workplaceTotal})`}
          </button>
        ) : null}
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
              <div key={client.id} className="directory-row directory-entry">
                <div className="detail">
                  <p>{client.name}</p>
                  <RateLines hourRatePence={client.hourRatePence} hourExtras={client.hourExtras} />
                  <p className="muted">{formatAddress(client) || 'No address yet'}</p>
                </div>
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
        {clientTotal > clients.length ? (
          <button
            className="button-ghost"
            type="button"
            disabled={loadingMoreClients}
            onClick={() => {
              void showMoreClients();
            }}
          >
            {loadingMoreClients ? 'Loading…' : `Show more (${clients.length} of ${clientTotal})`}
          </button>
        ) : null}
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

function RateLines({
  hourRatePence,
  hourExtras,
}: {
  hourRatePence: number;
  hourExtras: readonly HourExtra[];
}) {
  const extras = [...hourExtras].sort(compareHourExtras);
  return (
    <>
      <p className="muted">{formatPounds(hourRatePence)}/hour</p>
      {extras.length === 0 ? null : (
        <ul className="rate-list">
          {extras.map((extra) => (
            <li key={`${extra.massageType}:${extra.customMassageType ?? ''}`}>
              {massageTypeLabel(extra.massageType, extra.customMassageType)} +
              {formatPounds(extra.extraPence)}/hour
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
