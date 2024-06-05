import { ReadActions } from '$lib/server/graph/person.js';
import { userHasPermission } from '$lib/server/sutils.js';
import type { Person } from '$lib/types/person.js';
import { LIST_PEOPLE_QUERY_SCHEMA, type ListPeopleQuery } from '$lib/types/reqdata.js';
import { json } from '@sveltejs/kit';

export async function GET({ locals, url }) {
  if (!userHasPermission(locals.user, 'view')) {
    return new Response(null, { status: 403 });
  }
  const data = { skip: url.searchParams.get('skip'), limit: url.searchParams.get('skip') };
  const qry: ListPeopleQuery = LIST_PEOPLE_QUERY_SCHEMA.validateSync(data);
  const { people, count } = await ReadActions.perform(async act => {
    const people = await act.getPageOfPeople(qry.limit, qry.skip);
    const count = await act.countAllPeople();
    return { people, count };
  });
  return json({ people, totalCount: count } satisfies { people: Person[]; totalCount: number });
}
