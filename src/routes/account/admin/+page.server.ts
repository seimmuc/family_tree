import type { PageServerLoad } from './$types';
import { addConfigAdmin, userLoginRedirOrErrorIfNotAuthorized } from '$lib/server/sutils';
import { UserReadActions } from '$lib/server/graph/user';
import { USER_SCHEMA, type User } from '$lib/types';

const FETCHED_USER_LIMIT = 25;

export const load = (async ({ locals, url }) => {
  userLoginRedirOrErrorIfNotAuthorized(locals.user, 'admin', url, 'Must be signed in as an administrator');

  const usersDb = await UserReadActions.perform(async act => {
    return await act.getAllUsers(FETCHED_USER_LIMIT, 0);
  });

  const users: User[] = usersDb.map(u => addConfigAdmin(USER_SCHEMA.cast(u)));

  return { users, maxFetched: users.length >= FETCHED_USER_LIMIT };
}) satisfies PageServerLoad;
