import { ReadActions } from '$lib/server/graph/person.js';
import { SEARCH_QUERY_SCHEMA, type SearchQuery } from '$lib/types.js';
import { json } from '@sveltejs/kit';

export async function POST({ request }) {
  const qry: SearchQuery = SEARCH_QUERY_SCHEMA.validateSync(await request.json());
  const people = await ReadActions.perform(act => {
    if (qry.nameComplete) {
      return act.findPeopleByName(qry.nameQuery.trim());
    }
    return act.findPeopleByNamePartial(qry.nameQuery.trim());
  });
  // TODO only pass return id, name and photo for each person
  return json({ results: people });
}
