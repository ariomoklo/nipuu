// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Locals {
			requestId: string;
			startedAt: number;
		}
	}
}

declare module 'virtual:stylex:runtime';

export {};
