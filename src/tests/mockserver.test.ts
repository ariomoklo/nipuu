import type { ChildProcess } from 'node:child_process';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createRequest, startMockServer, stopMockServer, type MockRequest } from './client';

type Todo = {
	id: number;
	title: string;
	owner: string;
	completed: boolean;
};

type User = {
	id: string;
	name: string;
	email: string;
};

type ApiError = {
	error: string;
	details?: string[];
};

let child: ChildProcess | undefined;
let request!: MockRequest;
let createdId = 0;
let ownerId = '';

describe('Mock server', () => {
	beforeAll(async () => {
		const started = await startMockServer();
		child = started.child;
		request = createRequest(started.origin);
	}, 30_000);

	afterAll(async () => {
		await stopMockServer(child);
	}, 10_000);

	describe('Scenario: static greeting', () => {
		it('GET / returns Hello! as text/plain with CORS', async () => {
			const res = await request('GET', '/');
			expect(res.status).toBe(200);
			expect(res.contentType).toBe('text/plain; charset=utf-8');
			expect(res.body).toBe('Hello!');
			expect(res.headers.get('access-control-allow-origin')).toBe('*');
		});

		it('POST / is unmatched and returns 404', async () => {
			const res = await request('POST', '/');
			expect(res.status).toBe(404);
			expect(res.body).toEqual({ error: 'Not Found' });
		});
	});

	describe('Scenario: browse seeded todos', () => {
		it('GET /todos lists the two seeded todos', async () => {
			const res = await request<Todo[]>('GET', '/todos');
			expect(res.status).toBe(200);
			expect(res.body).toHaveLength(2);
			expect(res.body[0]).toEqual({
				id: 1,
				title: 'Todo 1',
				owner: expect.any(String),
				completed: false,
			});
			expect(res.body[1]).toEqual({
				id: 2,
				title: 'Todo 2',
				owner: expect.any(String),
				completed: false,
			});
		});

		it('GET /todos/:id returns one seeded todo', async () => {
			const res = await request('GET', '/todos/1');
			expect(res.status).toBe(200);
			expect(res.body).toEqual({
				id: 1,
				title: 'Todo 1',
				owner: expect.any(String),
				completed: false,
			});
		});

		it('GET /todos?q= filters by title include', async () => {
			const res = await request('GET', `/todos?q=${encodeURIComponent('Todo 1')}`);
			expect(res.status).toBe(200);
			expect(res.body).toEqual([
				expect.objectContaining({ id: 1, title: 'Todo 1', completed: false }),
			]);
		});

		it('GET /todos/:id returns 404 when the id is missing', async () => {
			const res = await request('GET', '/todos/99');
			expect(res.status).toBe(404);
			expect(res.body).toEqual({ error: 'Not Found' });
		});

		it('GET /unknown returns 404', async () => {
			const res = await request('GET', '/unknown');
			expect(res.status).toBe(404);
			expect(res.body).toEqual({ error: 'Not Found' });
		});
	});

	describe('Journey: todo lifecycle', () => {
		it('GET /users returns seeded owners', async () => {
			const res = await request<User[]>('GET', '/users');
			expect(res.status).toBe(200);
			expect(res.body).toHaveLength(2);
			expect(res.body[0]).toEqual({
				id: expect.any(String),
				name: 'User 1',
				email: 'user.1@example.com',
			});
			ownerId = res.body[0].id;
		});

		it('POST /todos creates a todo with a valid body', async () => {
			const res = await request<Todo>('POST', '/todos', { title: 'New todo', owner: ownerId });
			expect(res.status).toBe(200);
			expect(res.body).toEqual({
				id: 3,
				title: 'New todo',
				owner: ownerId,
				completed: false,
			});
			createdId = res.body.id;
		});

		it('POST /todos returns 400 when owner is missing', async () => {
			const res = await request<ApiError>('POST', '/todos', { title: 'No owner' });
			expect(res.status).toBe(400);
			expect(res.body.error).toBe('Validation failed');
			expect(res.body.details).toEqual(expect.arrayContaining([expect.stringContaining('owner')]));
		});

		it('GET /todos/:id returns the created todo', async () => {
			const res = await request('GET', `/todos/${createdId}`);
			expect(res.status).toBe(200);
			expect(res.body).toEqual({
				id: createdId,
				title: 'New todo',
				owner: ownerId,
				completed: false,
			});
		});

		it('PUT /todos/:id patches the title', async () => {
			const res = await request('PUT', `/todos/${createdId}`, { title: 'Renamed' });
			expect(res.status).toBe(200);
			expect(res.body).toEqual({
				id: createdId,
				title: 'Renamed',
				owner: ownerId,
				completed: false,
			});
		});

		it('PUT /todos/:id returns 400 when completed is the wrong type', async () => {
			const res = await request<ApiError>('PUT', `/todos/${createdId}`, { completed: 'yes' });
			expect(res.status).toBe(400);
			expect(res.body.error).toBe('Validation failed');
		});

		it('PUT /todos/:id/toggle flips completed', async () => {
			const res = await request('PUT', `/todos/${createdId}/toggle`);
			expect(res.status).toBe(200);
			expect(res.body).toEqual({
				id: createdId,
				title: 'Renamed',
				owner: ownerId,
				completed: true,
			});
		});

		it('DELETE /todos/:id removes the todo', async () => {
			const res = await request('DELETE', `/todos/${createdId}`);
			expect(res.status).toBe(200);
			expect(res.body).toEqual({
				id: createdId,
				title: 'Renamed',
				owner: ownerId,
				completed: true,
			});
		});

		it('GET /todos/:id returns 404 after delete', async () => {
			const res = await request('GET', `/todos/${createdId}`);
			expect(res.status).toBe(404);
			expect(res.body).toEqual({ error: 'Not Found' });
		});

		it('DELETE /todos/:id returns 404 when the row is already gone', async () => {
			const res = await request('DELETE', `/todos/${createdId}`);
			expect(res.status).toBe(404);
			expect(res.body).toEqual({ error: 'Not Found' });
		});
	});
});
