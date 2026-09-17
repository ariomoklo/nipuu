export const MODEL = {
	todos: (t) => ({
		id: t.id.index(),
		title: t
			.string()
			.required()
			.factory(({ index }) => `Todo ${index}`),
		owner: t.id.uuid().required().rel('users', { field: 'id' }),
		completed: t.boolean().default(false),
	}),
	users: (t) => ({
		id: t.id.uuid(),
		name: t
			.string()
			.required()
			.factory(({ index }) => `User ${index}`),
		email: t
			.string()
			.required()
			.factory(({ index }) => `user.${index}@example.com`),
	}),
};

export const ROUTE = {
	'/': {
		GET: {
			action: 'static',
			response: 'Hello!',
		},
	},
	'/slow': {
		GET: {
			action: 'static',
			response: 'slow',
			delay: 1500,
		},
		POST: {
			action: 'static',
			response: 'slow',
			delay: 1500,
		},
		PUT: {
			action: 'static',
			response: 'slow',
			delay: 1500,
		},
		PATCH: {
			action: 'static',
			response: 'slow',
			delay: 1500,
		},
		DELETE: {
			action: 'static',
			response: 'slow',
			delay: 1500,
		},
	},
	'/users': {
		GET: {
			action: 'search',
			model: 'users',
		},
	},
	'/todos': {
		GET: {
			action: 'search',
			model: 'todos',
			filter: {
				title: { source: 'queries', key: 'q', by: 'include' },
				completed: { source: 'queries', key: 'completed', by: 'equal' },
			},
		},
		POST: {
			action: 'upsert',
			model: 'todos',
		},
	},
	'/todos/:id': {
		GET: {
			action: 'find',
			model: 'todos',
			where: {
				id: { source: 'params', key: 'id', by: 'equal' },
			},
			response: ({ data, status, params }) =>
				status === 404 ? { error: `todo ${params.id} not found` } : data,
		},
		PUT: {
			action: 'update',
			model: 'todos',
			where: {
				id: { source: 'params', key: 'id' },
			},
			update: {
				title: { source: 'body', key: 'title' },
				owner: { source: 'body', key: 'owner' },
				completed: { source: 'body', key: 'completed' },
			},
		},
		DELETE: {
			action: 'delete',
			model: 'todos',
			where: {
				id: { source: 'params', key: 'id' },
			},
		},
	},
	'/todos/:id/toggle': {
		PUT: {
			action: 'update',
			model: 'todos',
			where: {
				id: { source: 'params', key: 'id', by: 'equal' },
			},
			update: {
				completed: (todo) => !todo.completed,
			},
		},
	},
	'/gone/:id': {
		GET: {
			action: 'find',
			model: 'todos',
			where: {
				id: { source: 'params', key: 'id' },
			},
			response: ({ params }) =>
				new Response(JSON.stringify({ id: params.id }), {
					status: 410,
					headers: { 'content-type': 'application/json', 'x-preset': 'gone' },
				}),
		},
	},
};

export const PRESET = {
	GET: {
		404: { error: 'Nothing here' },
	},
};
