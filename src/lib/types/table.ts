export type TableFieldKind = 'string' | 'boolean' | 'number' | 'enum' | 'id.index' | 'id.uuid';

export type TableFieldMeta = {
	name: string;
	type: TableFieldKind;
	required: boolean;
	hasDefault: boolean;
	enum?: string[];
	rel?: { table: string; field: string };
	operators: string[];
	autoId: boolean;
	identity: boolean;
};

export type TableRelationOption = {
	value: string;
	label?: string;
};

export type TableQueryPage = {
	rows: Record<string, unknown>[];
	total: number;
	page: number;
	limit: number;
};
