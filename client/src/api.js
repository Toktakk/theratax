const API_ORIGIN = 'http://localhost:3000';
const TOKEN_KEY = 'accessToken';
const SIGNED_OUT_EVENT = 'theratax-signed-out';
export class ApiError extends Error {
    status;
    constructor(status, message) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}
export function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
}
export function onSignedOut(listener) {
    window.addEventListener(SIGNED_OUT_EVENT, listener);
    return () => {
        window.removeEventListener(SIGNED_OUT_EVENT, listener);
    };
}
export function messageOf(error) {
    if (error instanceof ApiError) {
        return error.message;
    }
    if (error instanceof Error && error.message !== '') {
        return error.message;
    }
    return 'Request failed';
}
export async function request(path, options = {}) {
    const sendAuth = options.auth !== false;
    const token = sendAuth ? getToken() : null;
    const headers = bearerHeaders(token);
    let body;
    if (options.formData !== undefined) {
        body = options.formData;
    }
    else if (options.json !== undefined) {
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
    const payload = await response.json();
    return payload;
}
export async function downloadFile(path, fallbackName) {
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
    const filename = filenameFromDisposition(response.headers.get('Content-Disposition'), fallbackName);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}
export async function signIn(path, json) {
    const auth = await request(path, {
        method: 'POST',
        json,
        auth: false,
    });
    setToken(auth.accessToken);
    return request('/users/me');
}
function bearerHeaders(token) {
    const headers = new Headers();
    if (token !== null) {
        headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
}
function forgetToken() {
    clearToken();
    window.dispatchEvent(new Event(SIGNED_OUT_EVENT));
    if (window.location.pathname !== '/') {
        window.location.assign('/');
    }
}
async function readErrorMessage(response) {
    try {
        const body = await response.json();
        return messageFromBody(body);
    }
    catch {
        return response.statusText === '' ? 'Request failed' : response.statusText;
    }
}
function messageFromBody(body) {
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
function filenameFromDisposition(header, fallback) {
    if (header === null) {
        return fallback;
    }
    const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header);
    if (encoded?.[1] !== undefined && encoded[1] !== '') {
        try {
            return decodeURIComponent(encoded[1]);
        }
        catch {
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
