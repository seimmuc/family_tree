import { ReadActions } from "$lib/server/graph/person";
import { personStandardDate } from "$lib/server/graph/mgutils";

export async function load() {
  const people = await ReadActions.perform(async act => {
    const allPpl = await act.findAllPeople();
    return allPpl.map(personStandardDate);
  });
  return {
    people
  };
}
