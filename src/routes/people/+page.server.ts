import { ReadActions } from '$lib/server/graph/person';

export async function load() {
  const people = await ReadActions.perform(async act => {
    return await act.findAllPeople();
  });
  return {
    people
  };
}
