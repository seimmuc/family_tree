import { ReadActions } from '$lib/server/graph/person.js'
import { error, redirect } from '@sveltejs/kit';

export const GET = async ({ params }) => {
  const ppl = await ReadActions.perform(async act => {
    return act.findPeopleByName(params.name ?? 'Hades');
  });
  if (ppl.length < 1) {
    error(404);
  }
  redirect(302, `/tree/${ppl[0].id}`);
}
