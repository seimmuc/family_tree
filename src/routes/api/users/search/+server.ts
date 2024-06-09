import { UserReadActions } from '$lib/server/graph/user';
import { addConfigAdmin, locPr, userHasPermission } from '$lib/server/sutils.js';
import { USER_SCHEMA } from '$lib/types/user.js';
import { validateUsername } from '$lib/utils.js';
import { json } from '@sveltejs/kit';
import * as m from '$lib/paraglide/messages.js';

export async function POST({ request, locals }) {
  if (!userHasPermission(locals.user, 'admin')) {
    return json({ eCode: 'auth_error', error: m.seUnauthorized(...locPr(locals)) }, { status: 403 });
  }
  const reqJson = await request.json();
  if (typeof reqJson !== 'object' || validateUsername(reqJson.query).isErr()) {
    return json({ eCode: 'invalid_request', error: m.seInvalidRequest() }, { status: 400 });
  }

  const userDb = await UserReadActions.perform(act => {
    return act.getUserByUsername(reqJson.query.trim());
  });
  if (userDb === undefined) {
    return json({ result: undefined, eCode: 'user_not_found', error: m.seApiUserNotFound(...locPr(locals)) }, { status: 404 });
  }
  return json({ result: addConfigAdmin(USER_SCHEMA.cast(userDb)) }, { status: 200 });
}
