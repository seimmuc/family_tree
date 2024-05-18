import { object, string, boolean, type InferType } from 'yup';
import { PERSON_ID_ARRAY } from './person';

// POST /api/search
export const SEARCH_QUERY_SCHEMA = object({
  nameQuery: string().required().min(2).lowercase().trim(),
  nameComplete: boolean().default(false).optional()
});

export type SearchQuery = InferType<typeof SEARCH_QUERY_SCHEMA>;
export type SearchQueryCl = Partial<SearchQuery> & Required<Pick<SearchQuery, 'nameQuery'>>;


// POST /details/[uuid]?/update
export const RELATIVES_SINGLE_TYPE_CHANGE_SCHEMA = object({
  added: PERSON_ID_ARRAY,
  removed: PERSON_ID_ARRAY
}).noUnknown();

export type RelativesSingleTypeChange = InferType<typeof RELATIVES_SINGLE_TYPE_CHANGE_SCHEMA>;
export type RelativesChangeRequest = { [relType: string]: RelativesSingleTypeChange };
