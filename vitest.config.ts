import { configDefaults, defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

// Vitest config stays out of `vite.config.ts` so the published package never imports `vitest`.
export default mergeConfig(
	viteConfig,
	defineConfig({
		test: {
			environment: 'node',
			coverage: {
				provider: 'v8',
				reporter: ['text', 'lcov'],
				reportsDirectory: 'coverage',
				include: ['src/lib/server/**'],
				exclude: [...configDefaults.exclude, 'src/tests/**', 'src/lib/**/*.test.ts'],
				thresholds: {
					statements: 76,
					branches: 75,
					functions: 81,
					lines: 80,
				},
			},
			projects: [
				{
					test: {
						name: 'unit',
						include: ['src/**/*.test.ts'],
						exclude: [...configDefaults.exclude, 'src/tests/**'],
					},
				},
				{
					test: {
						name: 'mock',
						include: ['src/tests/**/*.test.ts'],
						fileParallelism: false,
						hookTimeout: 30_000,
						testTimeout: 30_000,
					},
				},
			],
		},
	}),
);
