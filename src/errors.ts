import { ApiError } from './api.js';

export class CliError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export function handleCliError(error: unknown): never {
  if (error instanceof ApiError) {
    const payload = error.body;
    const message = typeof payload === 'string' ? payload : error.message;
    console.error(`API error (${error.status}): ${message}`);
    if (payload && typeof payload === 'object') {
      console.error(JSON.stringify(payload, null, 2));
    }
  } else if (error instanceof CliError) {
    console.error(`Error: ${error.message}`);
  } else if (error instanceof Error) {
    console.error(`Error: ${error.message}`);
  } else {
    console.error('An unknown error occurred.');
  }

  process.exit(1);
}

export function wrapAction<T extends (...args: unknown[]) => Promise<void>>(action: T): (...args: unknown[]) => Promise<void> {
  return async (...args: unknown[]) => {
    try {
      await action(...(args as Parameters<T>));
    } catch (error) {
      handleCliError(error);
    }
  };
}
