import { Driver, ManagedTransaction, Session, auth, driver } from "neo4j-driver";
import { MEMGRAPH_URI, MEMGRAPH_USER, MEMGRAPH_PASSWORD, MEMGRAPH_DB_NAME } from '$env/static/private';
import type { TransactionConfig } from "neo4j-driver-core";

let connection: Promise<Driver> | null = null;

export async function getDbConnection(): Promise<Driver> {
  if (connection === null) {
    connection = new Promise(async (res) => {
      const drv = driver(MEMGRAPH_URI, auth.basic(MEMGRAPH_USER, MEMGRAPH_PASSWORD));
      const serverInfo = await drv.getServerInfo();
      res(drv);
    });
  }
  return connection;
}

export async function useSession<T>(cb: (session: Session) => Promise<T> | T): Promise<T> {
  const session = (await getDbConnection()).session({ database: MEMGRAPH_DB_NAME });
  try {
    return await cb(session);
  } finally {
    await session.close();
  }
}

export async function readTransaction<T>(cb: (tx: ManagedTransaction) => Promise<T> | T, config?: TransactionConfig): Promise<T> {
  const session = (await getDbConnection()).session({ database: MEMGRAPH_DB_NAME });
  try {
    return await session.executeRead(cb, config);
  } finally {
    await session.close();
  }
}

export async function writeTransaction<T>(cb: (tx: ManagedTransaction) => Promise<T> | T, config?: TransactionConfig): Promise<T> {
  const session = (await getDbConnection()).session({ database: MEMGRAPH_DB_NAME });
  try {
    return await session.executeWrite(cb, config);
  } finally {
    await session.close();
  }
}
