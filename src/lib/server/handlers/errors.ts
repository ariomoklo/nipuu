import { Data } from 'effect';

export class UnknownAction extends Data.TaggedError('UnknownAction')<{}> {}

export class InvalidStatic extends Data.TaggedError('InvalidStatic')<{}> {}

export type ActionBody =
	| { readonly _tag: 'Json'; readonly value: unknown }
	| { readonly _tag: 'Text'; readonly value: string | number }
	| { readonly _tag: 'Body'; readonly value: unknown };
