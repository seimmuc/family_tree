import { personStandardDate } from '$lib/server/graph/mgutils.js';
import { ReadActions } from '$lib/server/graph/person.js';
import { error } from '@sveltejs/kit';

export async function load({ params }) {
  console.log(`trying to find person with id=${params.id}`);
  const person = await ReadActions.perform(async act => {
    return await act.findPersonById(params.id);
  });
  
  if (person === undefined) {
    error(404);
  }

  return {
    person: personStandardDate(person)
  }
}
