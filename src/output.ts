import { Command } from 'commander';

export interface OutputOptions {
  json?: boolean;
  quiet?: boolean;
}

export function addOutputOptions(cmd: Command): void {
  cmd.option('-j, --json', 'Output raw JSON from the API')
    .option('-q, --quiet', 'Minimal output (just IDs or status)');
}

export function handleOutput<T>(
  data: T,
  options: OutputOptions,
  defaultPrinter: (value: T) => void,
  quietPrinter?: (value: T) => void
): void {
  if (options.json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (options.quiet) {
    if (quietPrinter) {
      quietPrinter(data);
    } else if (typeof data === 'string' || typeof data === 'number') {
      console.log(data);
    } else if (Array.isArray(data)) {
      data.forEach((entry) => console.log(getIdFromValue(entry)));
    } else {
      console.log(getIdFromValue(data));
    }
    return;
  }

  defaultPrinter(data);
}

function getIdFromValue(value: unknown): string {
  if (!value || typeof value !== 'object') {
    return String(value ?? '');
  }

  const candidate = (value as Record<string, unknown>).id;
  if (typeof candidate === 'string') {
    return candidate;
  }

  if (typeof candidate === 'number') {
    return String(candidate);
  }

  const fallback = (value as Record<string, unknown>).name;
  if (typeof fallback === 'string') {
    return fallback;
  }

  return JSON.stringify(value);
}
