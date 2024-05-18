import { userLoginRedirOrErrorIfNotAuthorized } from '$lib/server/sutils';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { Actions } from './$types';
import { ValidationError } from 'yup';
import { USER_OPTIONS_UPDATE_SCHEMA, USER_SCHEMA, type User, type UserOptions } from '$lib/types/user';
import { UserWriteActions } from '$lib/server/graph/user';

export const load = (async ({ locals, url }) => {
  userLoginRedirOrErrorIfNotAuthorized(locals.user, null, url);
}) satisfies PageServerLoad;

export const actions: Actions = {
  default: async ({ request, locals }) => {
    const user = locals.user;
    if (user === null) {
      return fail(403, { message: 'unauthorized' });
    }

    const formData = await request.formData();
    let upd: Partial<UserOptions>;
    try {
      const su = formData.get('settings-update');
      if (typeof su !== 'string') {
        return fail(422, { message: 'missing settings update data' });
      }
      upd = USER_OPTIONS_UPDATE_SCHEMA.validateSync(JSON.parse(su));
    } catch (e) {
      if (e instanceof ValidationError) {
        return fail(422, { message: e.message });
      }
      throw e;
    }

    const userDb = await UserWriteActions.perform(act => {
      return act.updateOptions(user.id, upd);
    });
    const u: User = USER_SCHEMA.cast(userDb);

    return { options: u.options };
  }
};
