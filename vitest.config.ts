import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['__tests__/**/*.test.ts'], environment: 'node' },
  resolve: { alias: { '@': new URL('./src/', import.meta.url).pathname } },
});
