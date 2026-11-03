import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { config } from 'dotenv';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const DEFAULT_API_HOST = 'http://localhost:8080';

/**
 * Loads `agency-web/.env` with dotenv (same behaviour as Next.js in tgr-web-tripgator).
 *
 * An existing environment variable wins over the file, so
 * `API_HOST=http://localhost:8081 pnpm start` still overrides `.env`.
 * A missing `.env` is not an error: the default below is used.
 */
export function loadEnvFile(path = resolve(ROOT, '.env')) {
  config({ path, quiet: true });
}

/** A bare host such as `api.example.com` gets an explicit scheme, because proxies need one. */
export function normalizeApiHost(value, fallback = DEFAULT_API_HOST) {
  const host = (value ?? '').trim() || fallback;
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(host) ? host : `http://${host}`;
}

export function resolveApiHost(env = process.env) {
  return normalizeApiHost(env.API_HOST);
}
