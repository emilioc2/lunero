import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
  resolve: {
    alias: {
      '@lunero/core': path.resolve(__dirname, '../../packages/core/src/index.ts'),
      '@lunero/ui': path.resolve(__dirname, '../../packages/ui/src/index.ts'),
      '@lunero/api-client': path.resolve(__dirname, '../../packages/api-client/src/index.ts'),
    },
  },
});
