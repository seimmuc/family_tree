import { building } from '$app/environment';
import { getDbConnection } from '$lib/server/graph/memgraph';

if (!building) {
  try {
    const db = await getDbConnection();
    const auth_success = await db.verifyAuthentication();
    if (!auth_success) {
      console.error('Database authentication failed!');
    }
  } catch (error) {
    console.error('Failed to connect to the database');
    console.error(error);
  }
}
