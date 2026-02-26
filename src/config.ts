import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

export interface CliConfig {
  token?: string;
}

const CONFIG_DIR = path.join(os.homedir(), '.pikarama');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

async function ensureConfigDir() {
  await mkdir(CONFIG_DIR, { recursive: true });
}

export async function readConfig(): Promise<CliConfig> {
  try {
    const contents = await readFile(CONFIG_PATH, 'utf-8');
    return JSON.parse(contents) as CliConfig;
  } catch (error) {
    return {};
  }
}

export async function saveConfig(config: CliConfig): Promise<void> {
  await ensureConfigDir();
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), { mode: 0o600 });
}

export async function setToken(token: string): Promise<void> {
  const config = await readConfig();
  config.token = token;
  await saveConfig(config);
}

export async function clearConfig(): Promise<void> {
  try {
    await rm(CONFIG_PATH);
  } catch (error) {
    // ignore missing file
  }
}

export async function getConfig(): Promise<CliConfig | null> {
  try {
    const contents = await readFile(CONFIG_PATH, 'utf-8');
    return JSON.parse(contents) as CliConfig;
  } catch (error) {
    return null;
  }
}
