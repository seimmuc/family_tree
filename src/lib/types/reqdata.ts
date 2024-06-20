import { object, string, boolean, type InferType, number, array } from 'yup';
import { PERSON_ID_ARRAY, PHOTO_ID } from './person';

// POST /api/search
export const SEARCH_QUERY_SCHEMA = object({
  nameQuery: string().required().min(2).lowercase().trim(),
  nameComplete: boolean().default(false).optional()
});

export type SearchQuery = InferType<typeof SEARCH_QUERY_SCHEMA>;
export type SearchQueryCl = Partial<SearchQuery> & Required<Pick<SearchQuery, 'nameQuery'>>;

// GET /api/list
export const LIST_PEOPLE_QUERY_SCHEMA = object({
  skip: number().min(0).optional().default(0),
  limit: number().min(1).max(100).optional().default(50)
});

export type ListPeopleQuery = InferType<typeof LIST_PEOPLE_QUERY_SCHEMA>;
export type ListPeopleQueryCl = Partial<ListPeopleQuery>;

// POST /details/[uuid]?/update
export const RELATIVES_SINGLE_TYPE_CHANGE_SCHEMA = object({
  added: PERSON_ID_ARRAY,
  removed: PERSON_ID_ARRAY
}).noUnknown();

export type RelativesSingleTypeChange = InferType<typeof RELATIVES_SINGLE_TYPE_CHANGE_SCHEMA>;
export type RelativesChangeRequest<RT extends string> = Partial<Record<RT, RelativesSingleTypeChange>>;

export const PHOTOS_CHANGES_SCHEMA = object({
  new: array(string().min(3).max(64).required()).required(),
  delete: array(PHOTO_ID).required()
}).noUnknown();

export type PhotoChanges = InferType<typeof PHOTOS_CHANGES_SCHEMA>;
