import type { Adapter, DatabaseSession, DatabaseUser } from 'lucia';
import { readTransaction, writeTransaction } from './memgraph';
import { UserReadActions } from './user';

type CyDatabaseSession = Omit<DatabaseSession, 'expiresAt'> & { expiresAt: number };

function dbSessionToCypher(s: DatabaseSession): CyDatabaseSession {
  return { ...s, expiresAt: s.expiresAt.getTime() };
}
function dbSessionFromCypher(s: CyDatabaseSession): DatabaseSession {
  return { ...s, expiresAt: new Date(s.expiresAt) };
}

export class LuciaCypherAdapter implements Adapter {
  async getSessionAndUser(sessionId: string): Promise<[session: DatabaseSession | null, user: DatabaseUser | null]> {
    const [session, user] = await UserReadActions.perform(async act => {
      const rs = await act.transaction.run('MATCH (s:DatabaseSession) WHERE s.id = $sid RETURN s', { sid: sessionId });
      if (rs.records.length < 1) {
        return [null, null];
      }
      const sess = dbSessionFromCypher(rs.records[0].get('s').properties as CyDatabaseSession);
      const user = await act.getUserById(sess.userId);
      return [sess, user];
    });
    if (session === null || user === undefined) {
      return [null, null];
    }
    return [session, { id: user.id, attributes: user }];
  }
  async getUserSessions(userId: string): Promise<DatabaseSession[]> {
    const r = await readTransaction(async tx => {
      return await tx.run('MATCH (s:DatabaseSession) WHERE s.userId = $userId RETURN s', { userId });
    });
    return r.records.map(r => dbSessionFromCypher(r.get('s').properties as CyDatabaseSession));
  }
  async setSession(session: DatabaseSession): Promise<void> {
    const s = dbSessionToCypher(session);
    return writeTransaction(async tx => {
      await tx.run('CREATE (s:DatabaseSession $session)', { session: s });
    });
  }
  async updateSessionExpiration(sessionId: string, expiresAt: Date): Promise<void> {
    const newET = expiresAt.getTime();
    return writeTransaction(async tx => {
      await tx.run('MATCH (s:DatabaseSession) WHERE s.id = $sessionId SET s.expiresAt = $expiresAt', {
        sessionId,
        expiresAt: newET
      });
    });
  }
  async deleteSession(sessionId: string): Promise<void> {
    return writeTransaction(async tx => {
      await tx.run('MATCH (s:DatabaseSession) WHERE s.id = $sessionId DELETE s', { sessionId });
    });
  }
  async deleteUserSessions(userId: string): Promise<void> {
    return writeTransaction(async tx => {
      await tx.run('MATCH (s:DatabaseSession) WHERE s.userId = $userId DELETE s', { userId });
    });
  }
  async deleteExpiredSessions(): Promise<void> {
    const curTime = Date.now();
    return writeTransaction(async tx => {
      const r = await tx.run('MATCH (s:DatabaseSession) WHERE s.expiresAt <= $curTime DELETE s', { curTime });
    });
  }
}
