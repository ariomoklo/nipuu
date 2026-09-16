import * as stylex from '@stylexjs/stylex';
import { colors, space } from '$lib/ui/shared/tokens.stylex';

/** Wrapper for a control that carries a picker chevron. */
export const field = stylex.create({
	root: {
		position: 'relative',
		display: 'block',
		width: '100%',
		maxWidth: '24rem',
	},
	marker: {
		position: 'absolute',
		insetInlineEnd: space.sm,
		insetBlockStart: '50%',
		transform: 'translateY(-50%)',
		display: 'flex',
		color: colors.mutedForeground,
		pointerEvents: 'none',
	},
	toggle: {
		margin: 0,
		padding: 0,
		appearance: 'none',
		borderWidth: 0,
		borderStyle: 'none',
		backgroundColor: 'transparent',
		pointerEvents: 'auto',
		cursor: 'pointer',
		':hover': {
			color: colors.foreground,
		},
	},
});
