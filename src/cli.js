#!/usr/bin/env node
import { createServer as createNodeServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import path from 'node:path';

const packageRoot = path.join(fileURLToPath(import.meta.url), '..', '..');
const cwd = process.cwd();

// SvelteKit overrides Vite's `root` with the current directory, so run from the package root.
process.chdir(packageRoot);

const nodeServer = createNodeServer();
const vite = await createServer({
	root: packageRoot,
	configFile: path.join(packageRoot, 'vite.config.ts'),
	appType: 'custom',
	server: {
		middlewareMode: true,
		hmr: { server: nodeServer },
	},
});

try {
	const program = await vite.ssrLoadModule('/src/lib/server/cli/main.ts');
	await program.main({ argv: process.argv.slice(2), cwd, vite, server: nodeServer });
} catch (error) {
	console.error(error);
	await vite.close();
	nodeServer.close();
	process.exit(1);
}
