import type { AuthResponse, User } from './types.ts';

const API_ORIGIN = import.meta.env.VITE_API_ORIGIN ?? 'http://localhost:3000';
const TOKEN_KEY = 'accessToken';
const SIGNED_OUT_EVENT = 'theratax-signed-out';

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  json?: unknown;
  formData?: FormData;
  auth?: boolean;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function onSignedOut(listener: () => void): () => void {
  window.addEventListener(SIGNED_OUT_EVENT, listener);
  return () => {
    window.removeEventListener(SIGNED_OUT_EVENT, listener);
  };
}

export function messageOf(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error && error.message !== '') {
    return error.message;
  }
  return 'Request failed';
}

export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const sendAuth = options.auth !== false;
  const token = sendAuth ? getToken() : null;
  const headers = bearerHeaders(token);
  let body: BodyInit | undefined;
  if (options.formData !== undefined) {
    body = options.formData;
  } else if (options.json !== undefined) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(options.json);
  }

  const response = await fetch(`${API_ORIGIN}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body,
    cache: 'no-store',
  });

  if (!response.ok) {
    if (response.status === 401 && token !== null) {
      forgetToken();
    }
    throw new ApiError(response.status, await readErrorMessage(response));
  }

  const payload: unknown = await response.json();
  return payload as T;
}

export async function downloadFile(
  path: string,
  fallbackName: string,
): Promise<void> {
  const token = getToken();
  const response = await fetch(`${API_ORIGIN}${path}`, {
    headers: bearerHeaders(token),
    cache: 'no-store',
  });
  if (!response.ok) {
    if (response.status === 401 && token !== null) {
      forgetToken();
    }
    throw new ApiError(response.status, await readErrorMessage(response));
  }

  const blob = await response.blob();
  const filename = filenameFromDisposition(
    response.headers.get('Content-Disposition'),
    fallbackName,
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function signIn(
  path: '/auth/register' | '/auth/login',
  json: { email: string; password: string; name?: string },
): Promise<User> {
  const auth = await request<AuthResponse>(path, {
    method: 'POST',
    json,
    auth: false,
  });
  setToken(auth.accessToken);
  return request<User>('/users/me');
}

function bearerHeaders(token: string | null): Headers {
  const headers = new Headers();
  if (token !== null) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return headers;
}

function forgetToken(): void {
  clearToken();
  window.dispatchEvent(new Event(SIGNED_OUT_EVENT));
  if (window.location.pathname !== '/') {
    window.location.assign('/');
  }
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    return messageFromBody(body);
  } catch {
    return response.statusText === '' ? 'Request failed' : response.statusText;
  }
}

function messageFromBody(body: unknown): string {
  if (typeof body !== 'object' || body === null || !('message' in body)) {
    return 'Request failed';
  }
  const message = body.message;
  if (typeof message === 'string') {
    return message;
  }
  if (Array.isArray(message)) {
    const lines = message.map((item) => String(item)).filter((item) => item !== '');
    if (lines.length > 0) {
      return lines.join('\n');
    }
  }
  return 'Request failed';
}

function filenameFromDisposition(header: string | null, fallback: string): string {
  if (header === null) {
    return fallback;
  }
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (encoded?.[1] !== undefined && encoded[1] !== '') {
    try {
      return decodeURIComponent(encoded[1]);
    } catch {
      return encoded[1];
    }
  }
  const quoted = /filename="([^"]+)"/i.exec(header);
  if (quoted?.[1] !== undefined && quoted[1] !== '') {
    return quoted[1];
  }
  const plain = /filename=([^;]+)/i.exec(header);
  const plainName = plain?.[1]?.trim();
  if (plainName !== undefined && plainName !== '') {
    return plainName;
  }
  return fallback;
}
