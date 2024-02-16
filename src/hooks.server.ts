import { building } from '$app/environment';
import { getDbConnection, useSession } from '$lib/server/graph/memgraph';

if (!building) {
  try {
    const db = await getDbConnection();
    const auth_success = await db.verifyAuthentication();
    if (!auth_success) {
      console.error('Database authentication failed!');
    }
    const startQueries = [
      'CREATE INDEX ON :Person;',
      'CREATE INDEX ON :Person(id);',
      'CREATE INDEX ON :Person(firstName);',
    ]
    await useSession(async s => {
      for (const q of startQueries) {
         await s.run(q);
      }
    });
  } catch (error) {
    console.error('Failed to connect to the database');
    throw error;
  }
}
