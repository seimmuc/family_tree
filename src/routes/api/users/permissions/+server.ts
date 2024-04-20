import { UserWriteActions } from '$lib/server/graph/user.js';
import { addConfigAdmin, userHasPermission } from '$lib/server/sutils.js';
import { USER_ID_SCHEMA, USER_PERMISSION_SCHEMA, USER_SCHEMA } from '$lib/types.js';
import type { UserID, UserPermChangesReq, UserPermission } from '$lib/types.js';
import { json } from '@sveltejs/kit';
import { ValidationError } from 'yup';

export async function POST({ request, locals }) {
  if (!userHasPermission(locals.user, 'admin')) {
    return json({ error: 'unauthorized' }, { status: 403 });
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
      return json({ error: 'invalid value' }, { status: 422 });
    } else {
      return json({ error: 'server error' }, { status: 500 });
    }
  }
  const userDb = await UserWriteActions.perform(act => {
    return act.modifyPermissions(uid, add, remove);
  });
  if (userDb === undefined) {
    return json({ error: 'user not found' }, { status: 404 });
  }
  return json({ result: addConfigAdmin(USER_SCHEMA.cast(userDb)) }, { status: 200 });
}
