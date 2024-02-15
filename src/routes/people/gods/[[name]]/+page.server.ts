import { ReadActions } from '$lib/server/graph/person.js';
import { error } from '@sveltejs/kit';

export async function load({ params }) {
  const godName = params.name ?? 'Zeus';

  const [people, relations] = await ReadActions.perform(async act => {
    const ppl = await act.findPeopleByFirstName(godName);
    if (ppl.length < 1) {
      error(404);
    }
    return await act.findPersonWithRelations(ppl[0].id as string, 2);
  });

  return {godName, people, relations};
}
