import type { FieldSchema, Schema } from '$lib/server/model/types';
import { Effect, Schema as S, SchemaIssue } from 'effect';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Mode = 'full' | 'partial';

const cached = new WeakMap<Schema, Partial<Record<Mode, S.Decoder<unknown>>>>();

function primitive(field: FieldSchema): S.Decoder<unknown> {
	switch (field.type) {
		case 'string':
			return S.String;
		case 'boolean':
			return S.Boolean;
		case 'number':
			return S.Number;
		case 'enum':
			return S.Literals(field.enum ?? []) as S.Decoder<unknown>;
		case 'id.index':
			return S.Int;
		case 'id.uuid':
			return S.String.check(S.isPattern(UUID_PATTERN)) as S.Decoder<unknown>;
	}
}

function fieldDecoder(field: FieldSchema, mode: Mode): S.Decoder<unknown> {
	const base = primitive(field);
	if (mode === 'full' && field.hasDefault) {
		return base.pipe(
			S.withDecodingDefaultKey(Effect.succeed(field.defaultValue)),
		) as S.Decoder<unknown>;
	}

	if (mode === 'full' && field.required) return base;

	return S.optionalKey(base) as S.Decoder<unknown>;
}

export function payloadSchema(table: Schema, partial: boolean): S.Decoder<unknown> {
	const mode: Mode = partial ? 'partial' : 'full';
	const hit = cached.get(table)?.[mode];
	if (hit) return hit;

	const fields: Record<string, S.Decoder<unknown>> = {};
	for (const field of Object.values(table.fields)) {
		fields[field.name] = fieldDecoder(field, mode);
	}

	const built = S.Struct(fields) as S.Decoder<unknown>;
	const entry = cached.get(table) ?? {};
	entry[mode] = built;
	cached.set(table, entry);
	return built;
}

export function typeMessage(field: FieldSchema): string {
	switch (field.type) {
		case 'string':
			return `${field.name} must be a string`;
		case 'boolean':
			return `${field.name} must be a boolean`;
		case 'number':
			return `${field.name} must be a number`;
		case 'enum':
			return `${field.name} must be a valid enum value`;
		case 'id.index':
			return `${field.name} must be an integer`;
		case 'id.uuid':
			return `${field.name} must be a valid UUID`;
	}
}

export function shapeMessages(issue: SchemaIssue.Issue, table: Schema): Map<string, string> {
	const messages = new Map<string, string>();

	const walk = (node: SchemaIssue.Issue) => {
		if (node._tag === 'Composite' || node._tag === 'AnyOf') {
			for (const child of node.issues) walk(child);
			return;
		}

		if (node._tag === 'Filter') {
			walk(node.issue);
			return;
		}

		if (node._tag !== 'Pointer' || node.path.length === 0) return;

		const name = String(node.path[0]);
		const field = table.fields[name];
		if (!field || messages.has(name)) return;

		const required = node.issue._tag === 'MissingKey';
		messages.set(name, required ? `${name} is required` : typeMessage(field));
	};

	walk(issue);
	return messages;
}
