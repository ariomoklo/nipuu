import path from 'node:path';
import { fileURLToPath } from 'node:url';
import adapter from '@sveltejs/adapter-auto';
import { sveltekit } from '@sveltejs/kit/vite';
import stylex from '@stylexjs/unplugin';
import { configDefaults, defineConfig } from 'vitest/config';

const root = path.dirname(fileURLToPath(import.meta.url));

const stylexPlugin = {
	...stylex.vite({
		// `reset` is declared before the priority layers so `$lib/ui/shared/reset.css`
		// never outranks StyleX classes on elements it also targets.
		useCSSLayers: { before: ['reset'] },
		aliases: {
			'$lib/*': path.join(root, 'src/lib/*')
		}
	}),
	enforce: undefined
};

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
			// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
			// See https://svelte.dev/docs/kit/adapters for more information about adapters.
			adapter: adapter()
		}),
		...(process.env.VITEST ? [] : [stylexPlugin])
	],
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
});
