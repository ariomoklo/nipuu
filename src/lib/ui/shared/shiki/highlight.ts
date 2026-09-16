import { createHighlighter, type Highlighter, type ThemeRegistration } from 'shiki';
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript';

const HIGHLIGHTER = Symbol.for('nipuu.shiki');

type GlobalShiki = typeof globalThis & {
	[HIGHLIGHTER]?: Promise<Highlighter>;
};

const LIGHT = theme('nipuu-light', {
	ink: '#0B1220',
	sky: '#0284C7',
	mute: '#64748B',
	paper: '#F7FAFC',
	kind: 'light',
});

const DARK = theme('nipuu-dark', {
	ink: '#F8FAFC',
	sky: '#38BDF8',
	mute: '#94A3B8',
	paper: '#0B1220',
	kind: 'dark',
});

function theme(
	name: string,
	swatch: { ink: string; sky: string; mute: string; paper: string; kind: 'light' | 'dark' },
): ThemeRegistration {
	return {
		name,
		type: swatch.kind,
		colors: {
			'editor.foreground': swatch.ink,
			'editor.background': swatch.paper,
		},
		settings: [
			{ settings: { foreground: swatch.ink, background: swatch.paper } },
			{
				scope: ['support.type.property-name.json', 'support.type.property-name'],
				settings: { foreground: swatch.sky },
			},
			{
				scope: ['string'],
				settings: { foreground: swatch.ink },
			},
			{
				scope: ['constant.numeric'],
				settings: { foreground: swatch.ink },
			},
			{
				scope: ['constant.language'],
				settings: { foreground: swatch.mute },
			},
			{
				scope: ['punctuation'],
				settings: { foreground: swatch.mute },
			},
		],
	};
}

function getHighlighter(): Promise<Highlighter> {
	const global = globalThis as GlobalShiki;
	global[HIGHLIGHTER] ??= createHighlighter({
		engine: createJavaScriptRegexEngine(),
		langs: ['json'],
		themes: [LIGHT, DARK],
	});

	return global[HIGHLIGHTER];
}

function tokenColors(htmlStyle: unknown): { light: string; dark: string } {
	if (htmlStyle && typeof htmlStyle === 'object' && !Array.isArray(htmlStyle)) {
		const vars = htmlStyle as Record<string, string>;
		return {
			light: vars['--shiki-light'] ?? '#0B1220',
			dark: vars['--shiki-dark'] ?? '#F8FAFC',
		};
	}

	return {
		light: '#0B1220',
		dark: '#F8FAFC',
	};
}

export type HighlightToken = {
	text: string;
	light: string;
	dark: string;
};

export type HighlightBlock = {
	source: string;
	lines: HighlightToken[][];
};

export function jsonSource(value: unknown): string {
	if (value === undefined) return 'undefined';
	return JSON.stringify(value, null, 2) ?? 'null';
}

export async function highlightJson(value: unknown): Promise<HighlightBlock> {
	const source = jsonSource(value);
	const highlighter = await getHighlighter();
	const result = highlighter.codeToTokens(source, {
		lang: 'json',
		themes: {
			light: 'nipuu-light',
			dark: 'nipuu-dark',
		},
		defaultColor: false,
	});

	return {
		source,
		lines: result.tokens.map((line) =>
			line.map((token) => {
				const colors = tokenColors(token.htmlStyle);
				return {
					text: token.content,
					light: colors.light,
					dark: colors.dark,
				};
			}),
		),
	};
}
