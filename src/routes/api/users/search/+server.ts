import { UserReadActions } from '$lib/server/graph/user';
import { userHasPermission } from '$lib/server/sutils.js';
import { USER_SCHEMA } from '$lib/types.js';
import { validateUsername } from '$lib/utils.js';
import { json } from '@sveltejs/kit';

export async function POST({ request, locals }) {
  if (!userHasPermission(locals.user, 'admin')) {
    return json({ error: 'unauthorized' }, { status: 403 });
  }
  const reqJson = await request.json();
  if (typeof reqJson !== 'object' || validateUsername(reqJson.query).isErr()) {
    return json({ error: 'invalid request' }, { status: 400 });
  }

  const userDb = await UserReadActions.perform(act => {
    return act.getUserByUsername(reqJson.query.trim());
  });
  if (userDb === undefined) {
    return json({ result: undefined, error: 'user not found' }, { status: 404 });
  }
  return json({ result: USER_SCHEMA.cast(userDb) }, { status: 200 });
}
