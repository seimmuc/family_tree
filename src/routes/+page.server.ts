import { ReadActions } from '$lib/server/graph/person.js';
import { userHasPermission } from '$lib/server/sutils.js';

const LIMIT = 50;

export async function load({ locals, depends }) {
  const user = locals.user;
  if (!userHasPermission(user, 'view')) {
    if (user === null) {
      return { signedIn: false, authorized: false };
    } else {
      return { signedIn: true, authorized: false };
    }
  }
  depends('data:personlist');
  const [initPeople, peopleCount] = await ReadActions.perform(async act => {
    const ppl = await act.getPageOfPeople(LIMIT);
    const len = ppl.length < LIMIT ? ppl.length : await act.countAllPeople();
    return [ppl, len];
  });
  return { signedIn: true, authorized: true, initPeople, peopleCount, pageSize: LIMIT };
}
