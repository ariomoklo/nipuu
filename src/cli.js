#!/usr/bin/env node
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const USAGE = 'Usage: nipuu <config-file> [--port 4210] [--seed 10]';
const DEFAULT_PORT = 4210;
const DEFAULT_SEED = 10;

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
	/** @type {string | undefined} */
	let config;
	let port = DEFAULT_PORT;
	let seed = DEFAULT_SEED;

	for (let i = 0; i < argv.length; i += 1) {
		const arg = argv[i];

		if (arg === '--help' || arg === '-h') {
			console.log(USAGE);
			process.exit(0);
		}

		if (arg === '--port') {
			const value = argv[++i];
			const parsed = Number(value);
			if (!value || !Number.isInteger(parsed) || parsed <= 0) {
				console.error(USAGE);
				process.exit(1);
			}

			port = parsed;
			continue;
		}

		if (arg === '--seed') {
			const value = argv[++i];
			const parsed = Number(value);
			if (!value || !Number.isInteger(parsed) || parsed < 0) {
				console.error(USAGE);
				process.exit(1);
			}

			seed = parsed;
			continue;
		}

		if (arg.startsWith('-')) {
			console.error(USAGE);
			process.exit(1);
		}

		if (config) {
			console.error(USAGE);
			process.exit(1);
		}

		config = arg;
	}

	if (!config) {
		console.error(USAGE);
		process.exit(1);
	}

	return { config, port, seed };
}

const { config, port, seed } = parseArgs(process.argv.slice(2));
const configPath = path.resolve(process.cwd(), config);

if (!existsSync(configPath)) {
	console.error(`Config file not found: ${configPath}`);
	console.error(USAGE);
	process.exit(1);
}

process.env.NIPUU_CONFIG = configPath;
process.env.NIPUU_PORT = String(port);
process.env.NIPUU_SEED = String(seed);

const packageRoot = path.join(fileURLToPath(import.meta.url), '..', '..');

// SvelteKit overrides Vite's `root` with the current directory, so run from the package root.
process.chdir(packageRoot);

const server = await createServer({
	root: packageRoot,
	configFile: path.join(packageRoot, 'vite.config.ts'),
	server: {
		port,
		strictPort: true
	}
});

await server.listen();

try {
	const runtime = await server.ssrLoadModule('/src/lib/server/runtime/index.ts');
	await runtime.initRuntime();
} catch (error) {
	console.error(error);
	await server.close();
	process.exit(1);
}

server.printUrls();
console.log(`Nipuu · config ${configPath} · seed ${seed}`);
