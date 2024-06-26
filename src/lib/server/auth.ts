import { Lucia, TimeSpan } from 'lucia';
import { LuciaCypherAdapter } from './graph/lucia-adapter';
import { dev } from '$app/environment';
import type { User, UserDB, UserID } from '$lib/types/user';

const adapter = new LuciaCypherAdapter();

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    attributes: {
      secure: !dev
    }
  },
  sessionExpiresIn: new TimeSpan(30, 'd'),
  getUserAttributes: attributes => {
    return {
      username: attributes.username,
      permissions: attributes.permissions,
      creationTime: attributes.creationTime,
      options: attributes.options ?? {}
    } satisfies Omit<User, 'id'>;
  }
});

declare module 'lucia' {
  interface Register {
    Lucia: typeof lucia;
    UserId: UserID;
    DatabaseUserAttributes: UserDB;
  }
}
