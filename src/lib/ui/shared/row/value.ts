import type { TableFieldMeta } from '$lib/types/table';

const TRUNCATE_AT = 24;

/** Form value for a field: relation cells collapse to the referenced value. */
export function fieldValue(row: Record<string, unknown>, field: TableFieldMeta): string {
	const cell = row[field.name];
	if (field.rel && cell !== null && typeof cell === 'object') {
		const related = (cell as Record<string, unknown>)[field.rel.field];
		if (typeof related === 'boolean') return related ? 'true' : 'false';
		if (related == null) return '';
		return String(related);
	}

	if (typeof cell === 'boolean') return cell ? 'true' : 'false';
	if (cell == null) return '';
	return String(cell);
}

/** Display text for a table cell. Empty values read as an em dash. */
export function cellText(row: Record<string, unknown>, field: TableFieldMeta): string {
	if (field.rel) return fieldValue(row, field) || '—';

	const cell = row[field.name];
	if (cell == null || cell === '') return '—';
	if (typeof cell === 'boolean') return cell ? 'true' : 'false';
	if (typeof cell === 'object') return JSON.stringify(cell);
	return String(cell);
}

/** Tooltip for a table cell: the whole relation, or the untruncated text. */
export function cellTitle(row: Record<string, unknown>, field: TableFieldMeta): string | undefined {
	const cell = row[field.name];
	if (cell !== null && typeof cell === 'object') return JSON.stringify(cell);

	const text = cellText(row, field);
	return text.length > TRUNCATE_AT ? text : undefined;
}

/** Identity values of a row, for labels and edit links. */
export function rowIdentity(
	row: Record<string, unknown>,
	fields: TableFieldMeta[],
): Record<string, string> {
	const identity: Record<string, string> = {};
	for (const field of fields) {
		if (!field.identity) continue;
		identity[field.name] = fieldValue(row, field);
	}

	return identity;
}
