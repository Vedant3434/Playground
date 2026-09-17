import { defineConfig } from 'vitest/config';

// Only the pure logic in src/lib is unit tested here; the React Native screens
// are exercised by running the app.
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
