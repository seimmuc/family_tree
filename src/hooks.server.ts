import { building } from '$app/environment';
import { MEDIA_ROOT } from '$env/static/private';
import { getDbConnection, useSession } from '$lib/server/graph/memgraph';
import { isTheme } from '$lib/types';
import { mkdir } from 'fs/promises';

if (!building) {
  try {
    const db = await getDbConnection();
    const auth_success = await db.verifyAuthentication();
    if (!auth_success) {
      console.error('Database authentication failed!');
    }
    const startQueries = ['CREATE INDEX ON :Person;', 'CREATE INDEX ON :Person(id);', 'CREATE INDEX ON :Person(name);'];
    await useSession(async s => {
      for (const q of startQueries) {
        await s.run(q);
      }
    });
  } catch (error) {
    console.error('Failed to connect to the database');
    throw error;
  }
  mkdir(MEDIA_ROOT, { recursive: true }).catch(err =>
    console.log(`Failed to create MEDIA_ROOT directory at "${MEDIA_ROOT}" due to following error: ${err}`)
  );
}

export async function handle({ event, resolve }) {
  let theme;
  return await resolve(event, {
		transformPageChunk: ({ html }) => {
      theme ??= event.cookies.get('theme');
			if (theme && isTheme(theme)) {
				html = html.replace(/<(html[^>]*)>/i, `<$1 data-theme="${theme}">`);
			}
			return html;
		}
	});
}
