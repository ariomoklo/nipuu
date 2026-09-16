import * as stylex from '@stylexjs/stylex';
import { colors, space, typography } from '$lib/ui/shared/tokens.stylex';

export const editor = stylex.create({
	root: {
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'flex-start',
		gap: space.lg,
		minWidth: '18rem',
		paddingTop: space.md,
		paddingBottom: space.sm
	},
	form: {
		display: 'flex',
		flexDirection: 'column',
		alignItems: 'flex-start',
		gap: space.md,
		width: '100%'
	},
	grid: {
		display: 'flex',
		flexDirection: 'column',
		gap: space.md,
		width: '100%',
		maxWidth: '24rem'
	},
	errorList: {
		margin: 0,
		marginBottom: space.lg,
		padding: 0,
		paddingInlineStart: space.md,
		color: colors.destructive,
		fontSize: typography.sizeBody
	}
});
