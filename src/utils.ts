import { CliError } from './errors.js';
import { readConfig } from './config.js';

export async function requireToken(): Promise<string> {
  const config = await readConfig();
  if (!config.token) {
    throw new CliError('You must log in first. Run `pikarama login` and store your API token.');
  }
  return config.token;
}

export function extractList<T>(payload: unknown, keys: string[] = ['groups', 'data', 'items']): T[] {
  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (payload && typeof payload === 'object') {
    for (const key of keys) {
      const candidate = (payload as Record<string, unknown>)[key];
      if (Array.isArray(candidate)) {
        return candidate as T[];
      }
    }
  }

  return [];
}

export function extractResource<T>(payload: unknown, keys: string[] = ['data', 'group', 'event', 'poll', 'result']): T {
  if (!payload || typeof payload !== 'object') {
    return payload as T;
  }

  for (const key of keys) {
    const candidate = (payload as Record<string, unknown>)[key];
    if (candidate && typeof candidate === 'object') {
      return candidate as T;
    }
  }

  return payload as T;
}
