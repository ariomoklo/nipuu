import { configDefaults, defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

// Vitest config stays out of `vite.config.ts` so the published package never imports `vitest`.
export default mergeConfig(
	viteConfig,
	defineConfig({
		test: {
			environment: 'node',
			projects: [
				{
					test: {
						name: 'unit',
						include: ['src/**/*.test.ts'],
						exclude: [...configDefaults.exclude, 'src/tests/**']
					}
				},
				{
					test: {
						name: 'mock',
						include: ['src/tests/**/*.test.ts'],
						fileParallelism: false,
						hookTimeout: 30_000,
						testTimeout: 30_000
					}
				}
			]
		}
	})
);
