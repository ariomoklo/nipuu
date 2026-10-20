import { isControlPlane } from '$lib/server/http/control';
import { describe, expect, it } from 'vitest';

describe('isControlPlane', () => {
	it('sends the StyleX dev assets to Vite', () => {
		expect(isControlPlane('/virtual:stylex.css')).toBe(true);
		expect(isControlPlane('/virtual:stylex.js')).toBe(true);
	});

	it('leaves mock API paths on the data plane', () => {
		expect(isControlPlane('/')).toBe(false);
		expect(isControlPlane('/users')).toBe(false);
	});
});
