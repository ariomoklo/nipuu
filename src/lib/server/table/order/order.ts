import type { Schema } from '$lib/server/model/types';

export function sortByForeignKey(schemas: Schema[]): Schema[] {
	const byName = new Map(schemas.map((table) => [table.name, table]));
	const deps = new Map<string, string[]>();

	for (const table of schemas) {
		const related = new Set<string>();
		for (const field of Object.values(table.fields)) {
			if (field.rel) related.add(field.rel.table);
		}

		deps.set(table.name, [...related]);
	}

	const sorted: Schema[] = [];
	const visiting = new Set<string>();
	const visited = new Set<string>();

	const visit = (name: string) => {
		if (visited.has(name)) return;
		if (visiting.has(name)) {
			throw new Error(`Circular relation involving table "${name}"`);
		}

		visiting.add(name);
		for (const dep of deps.get(name) ?? []) visit(dep);
		visiting.delete(name);
		visited.add(name);
		const table = byName.get(name);
		if (table) sorted.push(table);
	};

	for (const table of schemas) visit(table.name);
	return sorted;
}
