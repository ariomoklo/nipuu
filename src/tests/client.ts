import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import path from 'node:path';

const packageRoot = process.cwd();
const configPath = path.join(packageRoot, 'src/tests/config.mjs');
const cliPath = path.join(packageRoot, 'src/cli.js');
const seed = 2;

function childEnv(): NodeJS.ProcessEnv {
	const env = { ...process.env };
	delete env.VITEST;
	delete env.VITEST_WORKER_ID;
	return env;
}

function listenFreePort(): Promise<number> {
	return new Promise((resolve, reject) => {
		const server = createServer();
		server.listen(0, '127.0.0.1', () => {
			const address = server.address();
			if (!address || typeof address === 'string') {
				server.close();
				reject(new Error('Failed to bind a free port'));
				return;
			}

			const port = address.port;
			server.close((error) => {
				if (error) reject(error);
				else resolve(port);
			});
		});
		server.on('error', reject);
	});
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitUntilReady(
	port: number,
	processChild: ChildProcess,
	output: () => string,
): Promise<string> {
	const origins = [`http://127.0.0.1:${port}`, `http://localhost:${port}`];
	const deadline = Date.now() + 25_000;

	while (Date.now() < deadline) {
		if (processChild.exitCode !== null || processChild.signalCode) {
			throw new Error(
				`Mock server exited before ready (code ${processChild.exitCode}, signal ${processChild.signalCode}):\n${output()}`,
			);
		}

		for (const origin of origins) {
			try {
				const res = await fetch(`${origin}/`);
				if (res.status > 0) return origin;
			} catch {
				// The CLI is still booting Vite.
			}
		}

		await sleep(100);
	}

	processChild.kill('SIGKILL');
	throw new Error(`Mock server did not become ready:\n${output()}`);
}

export async function startMockServer(): Promise<{ child: ChildProcess; origin: string }> {
	const port = await listenFreePort();
	let output = '';
	const processChild = spawn(
		process.execPath,
		[cliPath, configPath, '--port', String(port), '--seed', String(seed)],
		{
			cwd: packageRoot,
			env: childEnv(),
			stdio: ['ignore', 'pipe', 'pipe'],
		},
	);

	const onData = (chunk: Buffer) => {
		output += chunk.toString();
	};

	processChild.stdout?.on('data', onData);
	processChild.stderr?.on('data', onData);

	try {
		const origin = await waitUntilReady(port, processChild, () => output);
		return { child: processChild, origin };
	} catch (error) {
		if (processChild.exitCode === null && !processChild.signalCode) {
			processChild.kill('SIGKILL');
		}

		throw error;
	}
}

export function stopMockServer(processChild: ChildProcess | undefined): Promise<void> {
	return new Promise((resolve) => {
		if (!processChild || processChild.exitCode !== null || processChild.signalCode) {
			resolve();
			return;
		}

		const timer = setTimeout(() => {
			if (processChild.exitCode === null && !processChild.signalCode) {
				processChild.kill('SIGKILL');
			}
		}, 3_000);

		processChild.on('exit', () => {
			clearTimeout(timer);
			resolve();
		});
		processChild.kill('SIGTERM');
	});
}

export function createRequest(origin: string): MockRequest {
	return async <T = unknown>(
		method: string,
		pathName: string,
		body?: unknown,
	): Promise<MockResponse<T>> => {
		const headers: Record<string, string> = {};
		const init: RequestInit = { method, headers };
		if (body !== undefined) {
			headers['content-type'] = 'application/json';
			init.body = JSON.stringify(body);
		}

		const res = await fetch(new URL(pathName, origin), init);
		const contentType = res.headers.get('content-type') ?? '';
		const raw = await res.text();
		const parsed = contentType.includes('application/json') && raw ? JSON.parse(raw) : raw;

		return {
			status: res.status,
			contentType,
			headers: res.headers,
			body: parsed as T,
		};
	};
}

export type MockResponse<T = unknown> = {
	status: number;
	contentType: string;
	headers: Headers;
	body: T;
};

export type MockRequest = <T = unknown>(
	method: string,
	pathName: string,
	body?: unknown,
) => Promise<MockResponse<T>>;
