import { highlightJson, jsonSource } from '$lib/ui/shared/shiki/highlight';
import { describe, expect, it } from 'vitest';

describe('jsonSource', () => {
	it('pretty-prints objects', () => {
		expect(jsonSource({ id: 1 })).toBe('{\n  "id": 1\n}');
	});

	it('renders undefined as a literal', () => {
		expect(jsonSource(undefined)).toBe('undefined');
	});
});

describe('highlightJson', () => {
	it('round-trips pretty-printed JSON', async () => {
		const value = { title: 'Todo', n: 2 };
		const block = await highlightJson(value);
		const text = block.lines.map((line) => line.map((token) => token.text).join('')).join('\n');

		expect(block.source).toBe(jsonSource(value));
		expect(text).toBe(block.source);
	});

	it('colors object keys with sky', async () => {
		const block = await highlightJson({ title: 'Todo' });
		const key = block.lines.flat().find((token) => token.text === 'title');

		expect(key?.light).toBe('#0284C7');
		expect(key?.dark).toBe('#38BDF8');
	});

	it('keeps string values in ink', async () => {
		const block = await highlightJson({ title: 'Todo' });
		const value = block.lines.flat().find((token) => token.text === 'Todo');

		expect(value?.light).toBe('#0B1220');
		expect(value?.dark).toBe('#F8FAFC');
	});
});
