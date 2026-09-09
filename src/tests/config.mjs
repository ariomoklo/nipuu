export const MODEL = {
	todos: (t) => ({
		id: t.id.index(),
		title: t
			.string()
			.required()
			.factory(({ index }) => `Todo ${index}`),
		owner: t.id.uuid().required().rel('users', { field: 'id' }),
		completed: t.boolean().default(false)
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
			.factory(({ index }) => `user.${index}@example.com`)
	})
};

export const ROUTE = {
	'/': {
		GET: {
			action: 'static',
			response: 'Hello!'
		}
	},
	'/users': {
		GET: {
			action: 'search',
			model: 'users'
		}
	},
	'/todos': {
		GET: {
			action: 'search',
			model: 'todos',
			filter: {
				title: { source: 'queries', key: 'q', by: 'include' },
				completed: { source: 'queries', key: 'completed', by: 'equal' }
			}
		},
		POST: {
			action: 'upsert',
			model: 'todos'
		}
	},
	'/todos/:id': {
		GET: {
			action: 'find',
			model: 'todos',
			where: {
				id: { source: 'params', key: 'id', by: 'equal' }
			}
		},
		PUT: {
			action: 'update',
			model: 'todos',
			where: {
				id: { source: 'params', key: 'id' }
			},
			update: {
				title: { source: 'body', key: 'title' },
				owner: { source: 'body', key: 'owner' },
				completed: { source: 'body', key: 'completed' }
			}
		},
		DELETE: {
			action: 'delete',
			model: 'todos',
			where: {
				id: { source: 'params', key: 'id' }
			}
		}
	},
	'/todos/:id/toggle': {
		PUT: {
			action: 'update',
			model: 'todos',
			where: {
				id: { source: 'params', key: 'id', by: 'equal' }
			},
			update: {
				completed: (todo) => !todo.completed
			}
		}
	}
};
