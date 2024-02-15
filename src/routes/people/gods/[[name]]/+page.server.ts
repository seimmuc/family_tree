import { personStandardDate } from '$lib/server/graph/mgutils';
import { ReadActions } from '$lib/server/graph/person.js';
import { error } from '@sveltejs/kit';

export async function load({ params }) {
  const godName = params.name ?? 'Zeus';

  const [focusPeopleIds, [people, relations]] = await ReadActions.perform(async act => {
    const ppl = await act.findPeopleByFirstName(godName);
    if (ppl.length < 1) {
      error(404);
    }
    const focusPerson = ppl[0];
    const partner = await act.findMainPartner(focusPerson.id);
    return [[focusPerson.id, partner?.id].filter(v => v !== undefined), await act.findPersonWithRelations(focusPerson.id, 2)];
  });

  return {godName, focusPeopleIds, people: people.map(personStandardDate), relations};
}
