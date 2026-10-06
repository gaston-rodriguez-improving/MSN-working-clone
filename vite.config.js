/* eslint-env node */
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'node:child_process';

const getBuildId = () => {
  if (process.env.APP_VERSION) return process.env.APP_VERSION;
  const sha = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_COMMIT;
  if (sha) return sha.slice(0, 12);
  try { return execSync('git rev-parse --short=12 HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return `${Date.now()}`; }
};
const buildId = getBuildId();

const versionFile = () => ({
  name: 'emit-version-file',
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version: buildId }) });
  },
});

const root = fileURLToPath(new URL('.', import.meta.url));

// https://vitejs.dev/config/
export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(buildId) },
  plugins: [react(), versionFile()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
        redirect: resolve(root, 'redirect.html'),
      },
    },
  },
});
