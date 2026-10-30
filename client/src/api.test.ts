import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearToken, getToken, onSignedOut, request, setToken } from './api.ts';

afterEach(() => {
  clearToken();
  vi.unstubAllGlobals();
});

describe('request', () => {
  it('returns JSON from a successful response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(Response.json({ id: 4, email: 'ada@example.com' })),
    );

    await expect(request<{ id: number }>('/users/me', { auth: false })).resolves.toEqual({
      id: 4,
      email: 'ada@example.com',
    });
  });

  it('accepts an empty success response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
    );

    await expect(request('/auth/session', { method: 'DELETE', auth: false })).resolves.toBeUndefined();
  });

  it('joins an array of validation messages', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(Response.json({ message: ['Name is required', 'Town is required'] }, { status: 400 })),
    );

    await expect(request('/clients', { method: 'POST', json: {}, auth: false })).rejects.toMatchObject({
      status: 400,
      message: 'Name is required\nTown is required',
    });
  });

  it('clears the token and signs out on 401', async () => {
    setToken('secret');
    const heard = vi.fn();
    const stop = onSignedOut(heard);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(Response.json({ message: 'Unauthorized' }, { status: 401 })),
    );

    await expect(request('/users/me')).rejects.toMatchObject({
      status: 401,
      message: 'Unauthorized',
    });
    expect(getToken()).toBeNull();
    expect(heard).toHaveBeenCalledOnce();
    stop();
  });
});
