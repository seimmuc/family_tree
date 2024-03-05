import type { ParamMatcher } from '@sveltejs/kit';

export const match: ParamMatcher = param => /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(param);
