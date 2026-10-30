import { loadEnvFile, resolveApiHost } from './scripts/api-host.mjs';

/**
 * Dev-server proxy. The app keeps calling relative `/api/...` URLs; only the target host
 * comes from the environment — `API_HOST` in `.env`, or `API_HOST=... pnpm start` for a
 * one-off run. No rebuild and no CORS involved.
 */
loadEnvFile();
const target = resolveApiHost();

console.log(`[proxy] /api -> ${target}`);

export default {
  '/api': {
    target,
    secure: false,
    changeOrigin: true,
  },
};
