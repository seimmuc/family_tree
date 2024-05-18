import { UserWriteActions } from '$lib/server/graph/user.js';
import { userHasPermission } from '$lib/server/sutils.js';
import { USER_ID_SCHEMA, type UserID } from '$lib/types/user.js';
import { json } from '@sveltejs/kit';
import { ValidationError } from 'yup';

export async function POST({ request, locals }) {
  if (!userHasPermission(locals.user, 'admin')) {
    return json({ error: 'unauthorized' }, { status: 403 });
  }
  const reqJson: { userId: UserID } = await request.json();
  let uid: UserID;
  try {
    uid = USER_ID_SCHEMA.validateSync(reqJson.userId);
  } catch (e) {
    if (e instanceof ValidationError) {
      return json({ error: 'invalid value' }, { status: 422 });
    } else {
      return json({ error: 'server error' }, { status: 500 });
    }
  }
  const deleted = await UserWriteActions.perform(act => {
    return act.deleteUser(uid);
  });
  if (!deleted) {
    return json({ error: 'user not found' }, { status: 404 });
  }
  return json({ result: 'deleted' }, { status: 200 });
}
