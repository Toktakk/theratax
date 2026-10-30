import { request } from './api.ts';
import type { ListResponse } from './types.ts';

const PAGE_LIMIT = 100;

export function listPath(path: string, skip: number): string {
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}limit=${PAGE_LIMIT}&skip=${skip}`;
}

export function requestList<T>(path: string, skip = 0): Promise<ListResponse<T>> {
  return request<ListResponse<T>>(listPath(path, skip));
}

export async function requestAll<T>(path: string): Promise<T[]> {
  const items: T[] = [];
  let skip = 0;
  for (;;) {
    const page = await requestList<T>(path, skip);
    items.push(...page.items);
    if (page.items.length === 0 || items.length >= page.total) {
      return items;
    }
    skip += page.items.length;
  }
}
