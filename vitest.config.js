// Behaviour checks: the audio tests render many seconds of sound, so they get longer than Vitest's 5 s default
// (several files run side by side and share the machine).
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['tools/checks/**/*.test.js'], testTimeout: 60000 } });
