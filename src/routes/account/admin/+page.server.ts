import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { createUrl } from '$lib/utils';
import { userHasPermission } from '$lib/server/sutils';
import { UserReadActions } from '$lib/server/graph/user';
import { USER_SCHEMA, type User } from '$lib/types';

const FETCHED_USER_LIMIT = 25;

export const load = (async ({ locals, url }) => {
  const user = locals.user;
  if (!userHasPermission(user, 'admin')) {
    if (user === null) {
      return redirect(302, createUrl('/account/login', url, { redirectTo: url.pathname }));
    }
    return error(403, { message: 'Must be signed in as an administrator' });
  }

  const usersDb = await UserReadActions.perform(async act => {
    return await act.getAllUsers(FETCHED_USER_LIMIT, 0);
  });

  const users: User[] = usersDb.map(u => USER_SCHEMA.cast(u));

  return { users, maxFetched: users.length >= FETCHED_USER_LIMIT };
}) satisfies PageServerLoad;
