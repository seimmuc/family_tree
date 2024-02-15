import type { DateOrLDT, Person, Relationship } from "$lib/types";
import { Integer, LocalDateTime, ManagedTransaction, Relationship as Neo4jRel } from "neo4j-driver";
import { readTransaction, writeTransaction } from "./memgraph";
import type { TransactionConfig } from "neo4j-driver-core";

// export async function findPersonById(id: string): Promise<Person<LocalDateTime> | undefined> {
//   return await readTransaction(async tx => {
//     const r = await tx.run('MATCH (p:Person) WHERE p.id = $id RETURN p LIMIT 1', {id});
//     return r.records[0]?.get('p')?.properties;
//   });
// }

type FilterOperator = '=' | '<>' | '<' | '<=' | '>' | '>=' | 'IN' | '=~' | 'CONTAINS' | 'STARTS WITH' | 'ENDS WITH';

type Filter = {
  prop: string,
  operator: FilterOperator,
  val: any
}

type WhereConditions<L extends number, OV extends string[] & {length: L}> = {conditions: string, params: {[k: string]: any}};

type PersonRelationType = 'PARENT' | 'SIBLING' | 'PARTNER';

/**
 * Constructs a condition string that can be injected into the query and its parameters from an array of filters
 * @param filters the filters
 * @returns A condition to be placed after the WHERE keyword in the query and corresponding parameters that the condition string requires.
 * Security warning: this method inserts filter operators into the condition string without any sanitization. Do not allow any user input to leak into the query.
 */
export function filtersWhereAnd<OV extends string>(filters: Filter[], objVar: OV): WhereConditions<1, [OV]> {
  const fq: [string, [string, any][]][] = filters.map((f, i) => [`p[$prop${i}] ${f.operator} $val${i}`, [[`prop${i}`, f.prop], [`val${i}`, f.val]]]);
  const conditions: string = fq.map(v => v[0]).join(' AND ');
  const params = Object.fromEntries(fq.flatMap(v => v[1]));
  return {conditions, params};
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
  async findAllPeople(): Promise<Person<LocalDateTime>[]> {
    const r = await this.transaction.run('MATCH (p:Person) RETURN p');
    return r.records.map(r => r.get('p').properties);
  }
  async findPersonById(id: string): Promise<Person<LocalDateTime> | undefined> {
    const r = await this.transaction.run('MATCH (p:Person) WHERE p.id = $id RETURN p LIMIT 1', {id});
    return r.records[0]?.get('p')?.properties;
  }
  async findPeopleByFirstName(firstName: string): Promise<Person<LocalDateTime>[]> {
    const r = await this.transaction.run('MATCH (p:Person {firstName: $fn}) RETURN p', {fn: firstName});
    return r.records.map(rec => rec.get('p').properties as Person<LocalDateTime>);
  }
  async findPersonWithRelations(personId: string, relationHops: number): Promise<[Person<LocalDateTime>[], Relationship[]]> {
    if (!Number.isInteger(relationHops)) {
      throw new TypeError('relationHops must be an integer');
    } else if (relationHops < 0 || relationHops > 25) {
      throw new RangeError('relationHops must be between 0 and 25');
    }

    // MATCH (:Person {firstName: "Hades"})-[*..25]-(t:Person)
    // WITH DISTINCT t
    // MATCH (t)-[r]-()
    // RETURN t, collect(r) as r
    // UNION
    // MATCH (p:Person {firstName: "Hades"})
    // RETURN p as t, null as r
    const r = await this.transaction.run(
      `MATCH (:Person {id: $pid})-[*..${relationHops}]-(t:Person) WITH DISTINCT t MATCH (t)-[r]-() RETURN t, collect(r) as r UNION MATCH (p:Person {id: $pid}) RETURN p as t, null as r`,
      {pid: personId}
    );

    const pIdenMap: {[identity: number]: string} = {};
    const rIdenSet: Set<number> = new Set();
    const [pl, rl] = r.records.reduce(([pl, rl], rc) => {
      const prsn = rc.get('t') as {identity: Integer, properties: Person<LocalDateTime>};
      pIdenMap[prsn.identity.toNumber()] = prsn.properties.id;
      pl.push(prsn.properties);
      const relArr = rc.get('r') as {identity: Integer, start: number, end: number, type: string}[] | null;
      if (relArr !== null) {
        relArr.forEach(rel => {
          if (!rIdenSet.has(rel.identity.toNumber())) {
            rIdenSet.add(rel.identity.toNumber());
            rl.push(rel);
          }
        });
      }
      return [pl, rl];
    }, [[], []] as [Array<Person<LocalDateTime>>, Array<{start: number, end: number, type: string}>]);

    const relations: Relationship[] = rl.map(rel => {
      if (!Object.hasOwn(pIdenMap, rel.start) || !Object.hasOwn(pIdenMap, rel.end)) { return; }
      if (rel.type === 'PARENT') {
        return {
          relType: rel.type.toLowerCase(),
          participants: {parent: [pIdenMap[rel.end]], child: [pIdenMap[rel.start]]}
        };
      }
      return;
    }).filter(v => v !== undefined) as Relationship[];

    return [pl, relations];
  }
}

export class WriteActions extends ReadActions {
  static async perform<T>(cb: (actions: WriteActions) => Promise<T> | T, config?: TransactionConfig): Promise<T> {
    return writeTransaction(async tx => {
      return cb(new WriteActions(tx));
    }, config);
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
   * @returns the person object, as it is returned from the databse server
   */
  async addPerson(person: Omit<Person<LocalDateTime<Integer | number>>, 'id'>): Promise<Person<LocalDateTime>> {
    const r = await this.transaction.run('CREATE (p:Person $pdata) SET p.id = randomUUID() RETURN p', {pdata: person});
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
  async addPersonRelation(fromPerson: string | Person<DateOrLDT>, toPerson: string | Person<DateOrLDT>, relationType: PersonRelationType): Promise<Neo4jRel | undefined> {
    if (typeof fromPerson === 'object') {
      fromPerson = fromPerson.id;
    }
    if (typeof toPerson === 'object') {
      toPerson = toPerson.id;
    }
    if (typeof fromPerson !== 'string' || typeof toPerson !== 'string') {
      throw Error('missing person id');
    }
    const r = await this.transaction.run(
      `MATCH (f:Person {id: $fid}), (t:Person {id: $tid}) CREATE (f)-[r:${relationType}]->(t) RETURN r`,
      {fid: fromPerson, tid: toPerson}
    );
    if (r.records.length > 1) {
      throw Error('db returned multiple new relation records, probably because multiple people have the same id');
    }
    return r.records[0]?.get('r') as Neo4jRel;
  }
}
