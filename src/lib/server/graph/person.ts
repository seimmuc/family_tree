import {
  PERSON_MAX_PHOTOS,
  type ParentRelationship,
  type PartnerRelationship,
  type Person,
  type PersonData,
  type Photo,
  type PhotoData,
  type Relationship,
  type UpdatablePerson
} from '$lib/types/person';
import type { ManagedTransaction, Relationship as Neo4jRel } from 'neo4j-driver';
import { Integer } from 'neo4j-driver';
import { readTransaction, writeTransaction } from './memgraph';
import type { TransactionConfig } from 'neo4j-driver-core';

type FilterOperator = '=' | '<>' | '<' | '<=' | '>' | '>=' | 'IN' | '=~' | 'CONTAINS' | 'STARTS WITH' | 'ENDS WITH';

type Filter = {
  prop: string;
  operator: FilterOperator;
  val: any;
};

type WhereConditions<L extends number, OV extends string[] & { length: L }> = {
  conditions: string;
  params: { [k: string]: any };
};

type PersonOrId = Person | Person['id'];
type PersonRelationType = 'PARENT' | 'SIBLING' | 'PARTNER';

function coerceIntoId(personOrId: PersonOrId): Person['id'] {
  if (typeof personOrId === 'object') {
    personOrId = personOrId.id;
  }
  if (typeof personOrId !== 'string') {
    throw new Error('missing person id');
  }
  return personOrId;
}

/**
 * Constructs a condition string that can be injected into the query and its parameters from an array of filters
 * @param filters the filters
 * @returns A condition to be placed after the WHERE keyword in the query and corresponding parameters that the condition string requires.
 * Security warning: this method inserts filter operators into the condition string without any sanitization. Do not allow any user input to leak into the query.
 */
export function filtersWhereAnd<OV extends string>(filters: Filter[], objVar: OV): WhereConditions<1, [OV]> {
  const fq: [string, [string, any][]][] = filters.map((f, i) => [
    `${objVar}[$prop${i}] ${f.operator} $val${i}`,
    [
      [`prop${i}`, f.prop],
      [`val${i}`, f.val]
    ]
  ]);
  const conditions: string = fq.map(v => v[0]).join(' AND ');
  const params = Object.fromEntries(fq.flatMap(v => v[1]));
  return { conditions, params };
}

export class ReadActions {
  transaction: ManagedTransaction;
  constructor(transaction: ManagedTransaction) {
    this.transaction = transaction;
  }
  static async perform<T>(cb: (actions: ReadActions) => Promise<T> | T, config?: TransactionConfig): Promise<T> {
    return readTransaction(async tx => {
      return cb(new ReadActions(tx));
    }, config);
  }
  async countAllPeople(): Promise<number> {
    const r = await this.transaction.run('MATCH (p:Person) RETURN count(p) as pcount');
    return (r.records[0].get('pcount') as Integer).toInt();
  }
  async findAllPeople(): Promise<Person[]> {
    const r = await this.transaction.run('MATCH (p:Person) RETURN p');
    return r.records.map(r => r.get('p').properties);
  }
  async getPageOfPeople(limit: number = 50, skip: number = 0): Promise<Person[]> {
    const r = await this.transaction.run('MATCH (p:Person) RETURN p ORDER BY p.name SKIP $skip LIMIT $limit', {
      limit: Integer.fromInt(limit),
      skip: Integer.fromInt(skip)
    });
    return r.records.map(r => r.get('p').properties);
  }
  async findPersonById(id: string): Promise<Person | undefined> {
    const r = await this.transaction.run('MATCH (p:Person) WHERE p.id = $id RETURN p LIMIT 1', { id });
    return r.records[0]?.get('p')?.properties;
  }
  async findPeopleByName(name: string): Promise<Person[]> {
    const r = await this.transaction.run('MATCH (p:Person {name: $n}) RETURN p', { n: name });
    return r.records.map(rec => rec.get('p').properties as Person);
  }
  async findPeopleByNamePartial(name: string): Promise<Person[]> {
    const r = await this.transaction.run('MATCH (p:Person) WHERE toLower(p.name) CONTAINS $n RETURN p', {
      n: name.toLowerCase()
    });
    return r.records.map(rec => rec.get('p').properties as Person);
  }
  async findMainPartner(personId: string): Promise<Person | undefined> {
    const r = await this.transaction.run('MATCH (:Person {id: $id})-[:PARTNER]-(p:Person) RETURN p', { id: personId });
    return r.records[0]?.get('p')?.properties;
  }
  async findPersonWithRelations(personId: string, relationHops: number): Promise<[Person[], Relationship[]]> {
    if (!Number.isInteger(relationHops)) {
      throw new TypeError('relationHops must be an integer');
    } else if (relationHops < 0 || relationHops > 25) {
      throw new RangeError('relationHops must be between 0 and 25');
    }

    // MATCH (:Person {name: "Hades"})-[*..25]-(t:Person)
    // WITH DISTINCT t
    // MATCH (t)-[r]-()
    // RETURN t, collect(r) as r
    // UNION
    // MATCH (p:Person {name: "Hades"})
    // RETURN p as t, null as r
    const r = await this.transaction.run(
      `MATCH (:Person {id: $pid})-[*..${relationHops}]-(t:Person) WITH DISTINCT t MATCH (t)-[r]-() RETURN t, collect(r) as r UNION MATCH (p:Person {id: $pid}) RETURN p as t, null as r`,
      { pid: personId }
    );

    const pIdenMap: { [identity: number]: string } = {};
    const rIdenSet: Set<number> = new Set();
    const [pl, rl] = r.records.reduce(
      ([pl, rl], rc) => {
        const prsn = rc.get('t') as { identity: Integer; properties: Person };
        pIdenMap[prsn.identity.toNumber()] = prsn.properties.id;
        pl.push(prsn.properties);
        const relArr = rc.get('r') as { identity: Integer; start: number; end: number; type: string }[] | null;
        if (relArr !== null) {
          relArr.forEach(rel => {
            if (!rIdenSet.has(rel.identity.toNumber())) {
              rIdenSet.add(rel.identity.toNumber());
              rl.push(rel);
            }
          });
        }
        return [pl, rl];
      },
      [[], []] as [Array<Person>, Array<{ start: number; end: number; type: string }>]
    );

    const relations: Relationship[] = rl
      .map(rel => {
        if (!Object.hasOwn(pIdenMap, rel.start) || !Object.hasOwn(pIdenMap, rel.end)) {
          return;
        }
        if (rel.type === 'PARENT') {
          return {
            relType: rel.type.toLowerCase(),
            participants: { parent: [pIdenMap[rel.end]], child: [pIdenMap[rel.start]] }
          };
        }
        return;
      })
      .filter(v => v !== undefined) as Relationship[];

    return [pl, relations];
  }
  async findFamily(partnerIds: string[], relationHops: number): Promise<[Person[], Relationship[]]> {
    if (!Number.isInteger(relationHops)) {
      throw new TypeError('relationHops must be an integer');
    } else if (relationHops < 0 || relationHops > 25) {
      throw new RangeError('relationHops must be between 0 and 25');
    }

    // MATCH (p:Person)-[*..1]-(t:Person)
    // WHERE p.name IN ["Aphrodite", "Ares"]
    // WITH DISTINCT t
    // MATCH (t)-[r]-()
    // RETURN t, collect(r) as r
    // UNION
    // MATCH (p:Person)
    // WHERE p.name IN ["Aphrodite", "Ares"]
    // RETURN p as t, null as r
    const r = await this.transaction.run(
      `MATCH (p:Person)-[*..${relationHops}]-(t:Person) WHERE p.id IN $pids WITH DISTINCT t MATCH (t)-[r]-() RETURN t, collect(r) as r UNION MATCH (p:Person) WHERE p.id IN $pids RETURN p as t, null as r`,
      { pids: partnerIds }
    );

    const pIdenMap: { [identity: number]: Person } = {};
    const rIdenMap: { [identity: number]: { start: number; end: number; type: PersonRelationType } } = {};
    for (const rc of r.records) {
      const prsnRc = rc.get('t') as { identity: Integer; properties: Person };
      pIdenMap[prsnRc.identity.toNumber()] = prsnRc.properties;
      const relArr = rc.get('r') as
        | { identity: Integer; start: number; end: number; type: PersonRelationType }[]
        | null;
      if (relArr !== null) {
        for (const rel of relArr) {
          rIdenMap[rel.identity.toNumber()] = rel;
        }
      }
    }

    const relations: Relationship[] = Object.values(rIdenMap)
      .map(rel => {
        if (!Object.hasOwn(pIdenMap, rel.start) || !Object.hasOwn(pIdenMap, rel.end)) {
          return;
        }
        if (rel.type === 'PARENT') {
          return {
            relType: 'parent',
            participants: { parent: [pIdenMap[rel.end].id], child: [pIdenMap[rel.start].id] }
          } as ParentRelationship;
        }
        if (rel.type === 'PARTNER') {
          return {
            relType: 'partner',
            participants: { partner: [pIdenMap[rel.start].id, pIdenMap[rel.end].id] }
          } as PartnerRelationship;
        }
        return;
      })
      .filter(v => v !== undefined) as Relationship[];

    return [Object.values(pIdenMap), relations];
  }
  async getPersonPhotos(person: PersonOrId): Promise<Photo[]> {
    person = coerceIntoId(person);
    const r = await this.transaction.run(
      'MATCH (:Person {id: $id})-[:IN_PHOTO]->(ph:Photo) RETURN ph ORDER BY ph.created LIMIT $limit',
      { id: person, limit: Integer.fromInt(PERSON_MAX_PHOTOS) }
    );
    return r.records.map(r => r.get('ph').properties);
  }
}

export class WriteActions extends ReadActions {
  static async perform<T>(cb: (actions: WriteActions) => Promise<T> | T, config?: TransactionConfig): Promise<T> {
    return writeTransaction(async tx => {
      return cb(new WriteActions(tx));
    }, config);
  }
  async deletePerson(personId: string): Promise<Person | undefined> {
    const r = await this.transaction.run(
      'MATCH (p:Person) WHERE p.id = $id WITH p, properties(p) AS rt DETACH DELETE p RETURN rt',
      { id: personId }
    );
    return r.records[0]?.get('rt');
  }
  /**
   * Deletes all people that match provided WHERE condition
   * @param condition condition to filter which people will get deleted
   */
  async deletePeople(condition: WhereConditions<1, ['p']>): Promise<number> {
    const r = await this.transaction.run(
      `MATCH (p:Person) WHERE ${condition.conditions} DETACH DELETE p RETURN count(p) as removed`,
      condition.params
    );
    return (r.records[0].get('removed') as Integer).toInt();
  }

  /**
   * Adds a person to the database
   * @param person the person object, do not include id property as it'll be assigned by the server
   * @returns the person object, as it is returned from the database server
   */
  async addPerson(person: PersonData): Promise<Person> {
    const r = await this.transaction.run('CREATE (p:Person $pdata) SET p.id = randomUUID() RETURN p', {
      pdata: person
    });
    return r.records[0].get('p').properties;
  }

  /**
   * Updates a person in the database
   * @param person the person object with new data, person.id must not change
   * @param partialUpdate if true, this will preserve existing properties in db that are missing in provided object; setting this to false value will clear all other properties from the person node in db, use with caution
   * @returns the updated person object, as it is returned from the database server
   */
  async updatePerson(person: UpdatablePerson, partialUpdate: boolean = true): Promise<Person> {
    if (!person.id) {
      throw new TypeError('missing person id');
    }
    const r = await this.transaction.run(
      `MATCH (p:Person {id: $pid}) SET p ${partialUpdate ? '+=' : '='} $pdata RETURN p LIMIT 1`,
      { pid: person.id, pdata: person }
    );
    return r.records[0].get('p').properties;
  }

  /**
   * Creates a relationship between 2 people
   * @param fromPersonId the relationship start person id
   * @param toPersonId the relationship end person id
   * @param relationType relationship type
   *
   * Security warning: relationType is injected into the query without any sanitization. Do not allow any user input to leak into it.
   */
  async addPersonRelation(
    fromPerson: PersonOrId,
    toPerson: PersonOrId,
    relationType: PersonRelationType
  ): Promise<Neo4jRel | undefined> {
    fromPerson = coerceIntoId(fromPerson);
    toPerson = coerceIntoId(toPerson);
    const r = await this.transaction.run(
      `MATCH (f:Person {id: $fid}), (t:Person {id: $tid}) CREATE (f)-[r:${relationType}]->(t) RETURN r`,
      { fid: fromPerson, tid: toPerson }
    );
    if (r.records.length > 1) {
      throw Error('db returned multiple new relation records, probably because multiple people have the same id');
    }
    return r.records[0]?.get('r') as Neo4jRel | undefined;
  }
  /**
   * Deletes a relationship between 2 people
   * @param fromPerson the relationship start person id
   * @param toPerson the relationship end person id
   * @param relationType relationship type
   *
   * Security warning: relationType is injected into the query without any sanitization. Do not allow any user input to leak into it.
   */
  async delPersonRelation(
    fromPerson: PersonOrId,
    toPerson: PersonOrId,
    relationType: PersonRelationType | undefined
  ): Promise<void> {
    fromPerson = coerceIntoId(fromPerson);
    toPerson = coerceIntoId(toPerson);
    const relLabel = relationType === undefined ? '' : ':' + relationType;
    const r = await this.transaction.run(`MATCH (f:Person {id: $fid})-[r${relLabel}]->(t:Person {id: $tid}) DELETE r`, {
      fid: fromPerson,
      tid: toPerson
    });
  }
  async addParentRelation(child: PersonOrId, parent: PersonOrId): Promise<Neo4jRel | undefined> {
    return this.addPersonRelation(child, parent, 'PARENT');
  }
  async delParentRelation(child: PersonOrId, parent: PersonOrId): Promise<void> {
    return this.delPersonRelation(child, parent, 'PARENT');
  }
  async addPartnerRelation(partner1: PersonOrId, partner2: PersonOrId): Promise<Neo4jRel | undefined> {
    // MATCH (p1:Person {id: $pi1}), (p2:Person {id: $pi2})
    // WHERE NOT exists((p1)-[:PARTNER]-(p2))
    // CREATE (p1)-[r:PARTNER]->(p2)
    // RETURN r
    const r = await this.transaction.run(
      'MATCH (p1:Person {id: $pi1}), (p2:Person {id: $pi2}) WHERE NOT exists((p1)-[:PARTNER]-(p2)) CREATE (p1)-[r:PARTNER]->(p2) RETURN r',
      { pi1: coerceIntoId(partner1), pi2: coerceIntoId(partner2) }
    );
    if (r.records.length > 1) {
      throw Error('db returned multiple new relation records, probably because multiple people have the same id');
    }
    return r.records[0]?.get('r') as Neo4jRel | undefined;
  }
  async delPartnerRelation(partner1: PersonOrId, partner2: PersonOrId): Promise<number> {
    const r = await this.transaction.run(
      'MATCH (:Person {id: $pi1})-[r:PARTNER]-(:Person {id: $pi2}) DELETE r RETURN count(r) as rc',
      { pi1: coerceIntoId(partner1), pi2: coerceIntoId(partner2) }
    );
    return (r.records[0].get('rc') as Integer).toInt();
  }
  async addPhotos(person: PersonOrId, photos: PhotoData[]): Promise<Photo[]> {
    // MATCH (p:Person {id: $id})
    // UNWIND $photos AS photo
    // CREATE (p)-[:IN_PHOTO]->(ph:Photo)
    // SET ph = photo
    // SET ph.id = randomUUID()
    // SET ph.created = $now
    // RETURN ph
    person = coerceIntoId(person);
    const r =  await this.transaction.run(
      'MATCH (p:Person {id: $id}) UNWIND $photos AS photo CREATE (p)-[:IN_PHOTO]->(ph:Photo) SET ph = photo, ph.id = randomUUID(), ph.created = $now RETURN ph',
      { id: person, photos, now: Date.now() }
    );
    return r.records.map(r => r.get('ph').properties);
  }
  async deletePhotos(person: PersonOrId, photoIds: Photo['id'][] | undefined): Promise<Photo['id'][]> {
    // MATCH (p:Person {id: $id})-[r:IN_PHOTO]->(ph:Photo)
    // WHERE $all OR ph.id IN $phids
    // DELETE r
    // WITH ph
    // OPTIONAL MATCH (ph)<-[r:IN_PHOTO]-(:Person)
    // WITH ph, count(r) AS rc, ph.id as phid
    // WHERE rc < 1
    // DELETE ph
    // RETURN collect(phid) as deleted
    person = coerceIntoId(person);
    const r = await this.transaction.run(
      'MATCH (p:Person {id: $id})-[r:IN_PHOTO]->(ph:Photo) WHERE $all OR ph.id IN $phids DELETE r WITH ph OPTIONAL MATCH (ph)<-[r:IN_PHOTO]-(:Person) WITH ph, count(r) AS rc, ph.id as phid WHERE rc < 1 DELETE ph RETURN collect(phid) as deleted',
      { id: person, phids: photoIds ?? [], all: photoIds === undefined }
    )
    return r.records[0]?.get('deleted');
  }
}
