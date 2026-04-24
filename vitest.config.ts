import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['./tests/setup.ts'],
    // Run test files sequentially to avoid race conditions with shared test directories
    fileParallelism: false,
  },
});
