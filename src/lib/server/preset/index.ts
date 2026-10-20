import { bodyResponse, serverError, toPresetContext } from '$lib/server/handlers/respond/respond';
import type { DispatchContext } from '$lib/server/handlers/sources/sources';
import { runAppPromise } from '$lib/server/effect/runtime';
import { callUser } from '$lib/server/user-code';
import type { PresetDefinition, PresetLeaf } from '$lib/types';
import { Effect } from 'effect';

const ANY = '*';

function escapeRegex(value: string): string {
	return value.replace(/[\\^$+?.()|[\]{}]/g, '\\$&');
}

function isGlob(pattern: string): boolean {
	return pattern.includes('*') || pattern.includes('?');
}

function literalCount(pattern: string): number {
	let count = 0;
	for (const char of pattern) {
		if (char !== '*' && char !== '?') count += 1;
	}

	return count;
}

function globMatch(pattern: string, value: string): boolean {
	let source = '^';
	for (const char of pattern) {
		if (char === '*') source += '.*';
		else if (char === '?') source += '.';
		else source += escapeRegex(char);
	}

	return new RegExp(`${source}$`).test(value);
}

function matchStatus(statuses: Record<string, PresetLeaf>, status: number): PresetLeaf | undefined {
	const key = String(status);
	if (Object.hasOwn(statuses, key) && statuses[key] !== undefined) {
		return statuses[key];
	}

	let best: PresetLeaf | undefined;
	let bestScore = -1;
	for (const [pattern, leaf] of Object.entries(statuses)) {
		if (leaf === undefined) continue;
		if (!isGlob(pattern)) continue;
		if (!globMatch(pattern, key)) continue;
		const score = literalCount(pattern);
		if (score <= bestScore) continue;
		best = leaf;
		bestScore = score;
	}

	return best;
}

function readLeaf(
	preset: PresetDefinition,
	method: string,
	status: number,
): PresetLeaf | undefined {
	for (const methodKey of [method, ANY]) {
		const statuses = preset[methodKey];
		if (!statuses) continue;
		const leaf = matchStatus(statuses, status);
		if (leaf !== undefined) return leaf;
	}

	return undefined;
}

export const applyPresetLeafEffect = (
	leaf: PresetLeaf,
	data: unknown,
	context: DispatchContext,
	status: number,
) =>
	Effect.gen(function* () {
		if (typeof leaf !== 'function') return bodyResponse(leaf, status);

		const mapped = yield* callUser('preset', 0, () => leaf(toPresetContext(data, context, status)));
		return mapped instanceof Response ? mapped : bodyResponse(mapped, status);
	});

export const applyPresetEffect = (
	preset: PresetDefinition | undefined,
	response: Response,
	data: unknown,
	context: DispatchContext,
) =>
	Effect.gen(function* () {
		if (!preset) return response;

		const leaf = readLeaf(preset, context.method, response.status);
		if (leaf === undefined) return response;

		return yield* applyPresetLeafEffect(leaf, data, context, response.status);
	});

function toPresetResponse(
	preset: PresetDefinition | undefined,
	response: Response,
	data: unknown,
	context: DispatchContext,
) {
	return applyPresetEffect(preset, response, data, context).pipe(
		Effect.catchTag('UserCodeFailed', () => Effect.succeed(serverError('Preset failed'))),
	);
}

export function applyPresetWith(
	preset: PresetDefinition | undefined,
	response: Response,
	data: unknown,
	context: DispatchContext,
): Promise<Response> {
	return runAppPromise(toPresetResponse(preset, response, data, context));
}
