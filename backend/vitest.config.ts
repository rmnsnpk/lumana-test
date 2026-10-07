import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const libsDir = fileURLToPath(new URL('./libs/', import.meta.url));

export default defineConfig({
  resolve: {
    alias: [{ find: /^#libs\/(.*)\.js$/, replacement: `${libsDir}$1.ts` }],
  },
  test: {
    include: ['apps/**/*.spec.ts', 'libs/**/*.spec.ts'],
    environment: 'node',
  },
});
