import { defineConfig } from 'vitest/config';

// Tests cover the pure TypeScript core (src/**). Anything that imports a native Expo
// module (expo-location, expo-speech, expo-sqlite) is kept out of the tested files and
// injected through interfaces instead.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
