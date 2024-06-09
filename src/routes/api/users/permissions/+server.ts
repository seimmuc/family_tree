import { UserWriteActions } from '$lib/server/graph/user.js';
import { addConfigAdmin, locPr, userHasPermission } from '$lib/server/sutils.js';
import { USER_ID_SCHEMA, USER_PERMISSION_SCHEMA, USER_SCHEMA } from '$lib/types/user.js';
import type { UserID, UserPermChangesReq, UserPermission } from '$lib/types/user.js';
import { json } from '@sveltejs/kit';
import { ValidationError } from 'yup';
import * as m from '$lib/paraglide/messages.js';

export async function POST({ request, locals }) {
  if (!userHasPermission(locals.user, 'admin')) {
    return json({ eCode: 'auth_error', error: m.seUnauthorized(...locPr(locals)) }, { status: 403 });
  }
  const reqJson: UserPermChangesReq = await request.json();
  let uid: UserID;
  let [add, remove]: [UserPermission[], UserPermission[]] = [[], []];
  try {
    uid = USER_ID_SCHEMA.validateSync(reqJson.user);
    for (const pc of reqJson.changes) {
      if (!['add', 'del'].includes(pc.change)) {
        throw new ValidationError('invalid value');
      }
      (pc.change === 'add' ? add : remove).push(USER_PERMISSION_SCHEMA.validateSync(pc.perm));
    }
  } catch (e) {
    if (e instanceof ValidationError) {
      return json({ eCode: 'invalid_input', error: m.seInvalidValue(...locPr(locals)) }, { status: 422 });
    } else {
      return json({ eCode: 'unknown_error', error: m.seServerError(...locPr(locals)) }, { status: 500 });
    }
  }
  const userDb = await UserWriteActions.perform(act => {
    return act.modifyPermissions(uid, add, remove);
  });
  if (userDb === undefined) {
    return json({ eCode: 'user_not_found', error: m.seApiUserNotFound(...locPr(locals)) }, { status: 404 });
  }
  return json({ result: addConfigAdmin(USER_SCHEMA.cast(userDb)) }, { status: 200 });
}
