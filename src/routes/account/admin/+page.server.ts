import type { PageServerLoad } from './$types';
import { addConfigAdmin, locPr, userLoginRedirOrErrorIfNotAuthorized } from '$lib/server/sutils';
import { UserReadActions } from '$lib/server/graph/user';
import { USER_SCHEMA, type User } from '$lib/types/user';
import * as m from '$lib/paraglide/messages.js';

const FETCHED_USER_LIMIT = 25;

export const load = (async ({ locals, url }) => {
  userLoginRedirOrErrorIfNotAuthorized(locals.user, 'admin', url, m.errAuthMustBeAdmin(...locPr(locals)));

  const usersDb = await UserReadActions.perform(async act => {
    return await act.getAllUsers(FETCHED_USER_LIMIT, 0);
  });

  const users: User[] = usersDb.map(u => addConfigAdmin(USER_SCHEMA.cast(u)));

  return { users, maxFetched: users.length >= FETCHED_USER_LIMIT };
}) satisfies PageServerLoad;
