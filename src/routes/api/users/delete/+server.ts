import { UserWriteActions } from '$lib/server/graph/user.js';
import { locPr, userHasPermission } from '$lib/server/sutils.js';
import { USER_ID_SCHEMA, type UserID } from '$lib/types/user.js';
import { json } from '@sveltejs/kit';
import { ValidationError } from 'yup';
import * as m from '$lib/paraglide/messages.js';

export async function POST({ request, locals }) {
  if (!userHasPermission(locals.user, 'admin')) {
    return json({ eCode: 'auth_error', error: m.seUnauthorized(...locPr(locals)) }, { status: 403 });
  }
  const reqJson: { userId: UserID } = await request.json();
  let uid: UserID;
  try {
    uid = USER_ID_SCHEMA.validateSync(reqJson.userId);
  } catch (e) {
    if (e instanceof ValidationError) {
      return json({ eCode: 'invalid_input', error: m.seInvalidValue(...locPr(locals)) }, { status: 422 });
    } else {
      return json({ eCode: 'unknown_error', error: m.seServerError(...locPr(locals)) }, { status: 500 });
    }
  }
  const deleted = await UserWriteActions.perform(act => {
    return act.deleteUser(uid);
  });
  if (!deleted) {
    return json({ eCode: 'user_not_found', error: m.seApiUserNotFound(...locPr(locals)) }, { status: 404 });
  }
  return json({ result: 'deleted' }, { status: 200 });
}
