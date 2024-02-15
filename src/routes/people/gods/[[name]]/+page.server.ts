import { personStandardDate } from '$lib/server/graph/mgutils';
import { ReadActions } from '$lib/server/graph/person.js';
import { error } from '@sveltejs/kit';

export async function load({ params }) {
  const godName = params.name ?? 'Zeus';

  const [personId, [people, relations]] = await ReadActions.perform(async act => {
    const ppl = await act.findPeopleByFirstName(godName);
    if (ppl.length < 1) {
      error(404);
    }
    const personId = ppl[0].id as string;
    return [personId, await act.findPersonWithRelations(personId, 2)];
  });

  return {godName, personId, people: people.map(personStandardDate), relations};
}
