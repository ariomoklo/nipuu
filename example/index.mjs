export const MODEL = {
  todos: (t) => ({
    id: t.id.index(),
    title: t
      .string()
      .required()
      .factory(({ index }) => `Todo ${index}`),
    owner: t.id.uuid().required().rel("users", "id"),
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
  "/": {
    GET: "Hello!",
  },
  "/todos": {
    GET: {
      action: "search",
      model: "todos",
      filter: {
        title: { source: "queries", key: "q", by: "include" },
        completed: { source: "queries", key: "completed", by: "equal" },
      },
      sort: {
        sortBy: { source: "queries", key: "sortBy" },
        orderBy: { source: "queries", key: "orderBy" },
      },
      pagination: {
        type: "cursor",
        start: { source: "queries", key: "from" },
        end: { source: "queries", key: "to" },
        limit: { source: "queries", key: "limit" },
      },
      response: ({ data, model }) => ({
        todos: data.map((todo) =>
          model.users.find((user) => todo.owner === user.id),
        ),
        total: data.length,
      }),
    },
    POST: {
      action: "upsert",
      model: "todos",
    },
  },
  "/todos/:id": {
    GET: {
      action: "find",
      model: "todos",
      where: {
        id: { source: "params", key: "id", by: "equal" },
      },
    },
    PUT: {
      action: "update",
      model: "todos",
      where: {
        id: { source: "params", key: "id" },
      },
      update: {
        title: { source: "body", key: "title" },
        owner: { source: "body", key: "owner" },
        completed: { source: "body", key: "completed" },
      },
    },
    DELETE: {
      action: "delete",
      model: "todos",
      where: {
        id: { source: "params", key: "id" },
      },
    },
  },
  "/todos/:id/toggle": {
    PUT: {
      action: "update",
      model: "todos",
      where: {
        id: { source: "params", key: "id", by: "equal" },
      },
      update: {
        completed: (todo) => !todo.completed,
      },
    },
  },
  "/users/:id/todos": {
    GET: {
      action: "search",
      model: "todos",
      where: {
        owner: { source: "params", key: "id", by: "equal" },
      },
      filter: {
        title: { source: "queries", key: "q", by: "include" },
        owner: { source: "queries", key: "owner", by: "include" },
        completed: { source: "queries", key: "completed", by: "equal" },
      },
      sort: {
        sortBy: { source: "queries", key: "sortBy" },
        orderBy: { source: "queries", key: "orderBy" },
      },
      pagination: {
        type: "cursor",
        start: { source: "queries", key: "from" },
        end: { source: "queries", key: "to" },
        limit: { source: "queries", key: "limit" },
      },
    },
  },
};
