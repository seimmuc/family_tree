import type { RequestEvent, RequestHandler } from './$types';
import { lucia } from '$lib/server/auth';

async function logOut({ locals, cookies }: Pick<RequestEvent, 'locals' | 'cookies'>): Promise<Response | undefined> {
  if (!locals.session) {
    return new Response(null, { status: 401 });
  }
  await lucia.invalidateSession(locals.session.id);
  const sCookie = lucia.createBlankSessionCookie();
  cookies.set(sCookie.name, sCookie.value, { path: '.', ...sCookie.attributes });
  return;
}

export const GET: RequestHandler = async event => {
  await logOut(event);
  // doesn't matter if operation was a success or not, redirect anyway
  const redirectTo = event.url.searchParams.get('redirectTo') ?? '/';
  return new Response(null, { status: 302, headers: { location: redirectTo } });
};

export const POST: RequestHandler = async event => {
  const resp = await logOut(event);
  return resp ?? new Response(null, { status: 200 });
};
