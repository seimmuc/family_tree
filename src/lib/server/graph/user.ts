import { type ManagedTransaction, Integer } from 'neo4j-driver';
import { readTransaction, writeTransaction } from './memgraph';
import type { TransactionConfig } from 'neo4j-driver-core';
import type { UserDB, UserID, UserPermission } from '$lib/types';
import { err, ok, type Result } from 'neverthrow';

export class UserReadActions {
  transaction: ManagedTransaction;
  constructor(transaction: ManagedTransaction) {
    this.transaction = transaction;
  }
  static async perform<T>(cb: (actions: UserReadActions) => Promise<T> | T, config?: TransactionConfig): Promise<T> {
    return readTransaction(async tx => {
      return cb(new UserReadActions(tx));
    }, config);
  }
  async getUserCount(): Promise<number> {
    const r = await this.transaction.run('MATCH (u:User) RETURN count(u) as uc');
    return (r.records[0].get('uc') as Integer).toInt();
  }
  async getAllUsers(limit: number = 50, skip: number = 0): Promise<UserDB[]> {
    const r = await this.transaction.run('MATCH (u:User) RETURN u ORDER BY u.creationTime SKIP $s LIMIT $l', {
      l: Integer.fromInt(limit),
      s: Integer.fromInt(skip)
    });
    return r.records.map(r => r.get('u').properties);
  }
  async getUserById(id: UserID): Promise<UserDB | undefined> {
    const r = await this.transaction.run('MATCH (u:User) WHERE u.id = $id RETURN u LIMIT 1', { id });
    return r.records[0]?.get('u')?.properties;
  }
  async getUserByUsername(username: string): Promise<UserDB | undefined> {
    username = username.trim().toLowerCase();
    const r = await this.transaction.run('MATCH (u:User) WHERE toLower(u.username) = $username RETURN u LIMIT 1', {
      username
    });
    return r.records[0]?.get('u')?.properties;
  }
}
export class UserWriteActions extends UserReadActions {
  static async perform<T>(cb: (actions: UserWriteActions) => Promise<T> | T, config?: TransactionConfig): Promise<T> {
    return writeTransaction(async tx => {
      return cb(new UserWriteActions(tx));
    }, config);
  }
  async addUser(user: Omit<UserDB, 'id' | 'creationTime'>): Promise<Result<UserDB, string>> {
    const existingUsername = await this.getUserByUsername(user.username);
    if (existingUsername !== undefined) {
      return err('username is already in use');
    }
    const r = await this.transaction.run('CREATE (u:User $user) SET u.id = randomUUID() RETURN u', {
      user: { ...user, creationTime: Date.now() }
    });
    const dbUser = r.records[0].get('u').properties as UserDB;
    if (dbUser === undefined) {
      return err('something went wrong');
    }
    return ok(dbUser);
  }
  async modifyPermissions(
    userId: UserID,
    add: UserPermission[],
    remove: UserPermission[]
  ): Promise<UserDB | undefined> {
    // MATCH (u:User)
    // WHERE u.id = $id
    // SET u.permissions = collections.to_set(collections.remove_all(u.permissions, $rem) + $add)
    // RETURN u;
    const r = await this.transaction.run(
      'MATCH (u:User) WHERE u.id = $id SET u.permissions = collections.to_set(collections.remove_all(u.permissions, $rem) + $add) RETURN u LIMIT 1',
      { id: userId, rem: remove, add }
    );
    return r.records[0]?.get('u')?.properties;
  }
  async deleteUser(userId: UserID): Promise<boolean> {
    const r = await this.transaction.run('MATCH (u:User) WHERE u.id = $uid DELETE u RETURN count(u) as c', {
      uid: userId
    });
    return (r.records[0].get('c') as Integer).toInt() > 0;
  }
}
