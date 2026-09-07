import { sequence } from '@sveltejs/kit/hooks';
import { handleControlPlane, handleCors, handleDataPlane } from '$lib/server/http';

export const handle = sequence(handleCors, handleControlPlane, handleDataPlane);
