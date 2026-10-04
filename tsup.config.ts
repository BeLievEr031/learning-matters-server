import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts'],
  format: ['esm'],
  outDir: 'dist',
  target: 'node22',
  sourcemap: true,
  clean: true,
  splitting: false,
  dts: false,
  tsconfig: 'tsconfig.build.json',
});
