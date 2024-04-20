import { ReadActions } from '$lib/server/graph/person.js';
import { userHasPermission } from '$lib/server/sutils.js';
import { SEARCH_QUERY_SCHEMA, type SearchQuery } from '$lib/types.js';
import { json } from '@sveltejs/kit';

export async function POST({ request, locals }) {
  if (!userHasPermission(locals.user, 'view')) {
    return new Response(null, { status: 403 });
  }
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
