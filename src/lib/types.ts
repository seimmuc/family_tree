import type { Integer, LocalDateTime } from "neo4j-driver";

export type DateOrLDT = Date | LocalDateTime<number | Integer>;

export interface Person<DT extends DateOrLDT = Date> {
  id?: string;
  firstName: string;
  lastName?: string;
  nickname?: string;
  title?: string;
  suffix?: string;
  gender?: string;
  birthDate?: DT;
  deathDate?: DT;
}

export interface Relationship {
  relType: string;
  participants: Record<string, string[]>;
}

export interface ParentRelationship extends Relationship {
  relType: 'parent';
  participants: Record<'parent' | 'child', [string]>;
}

export class Parentship implements ParentRelationship {
  relType: 'parent' = 'parent';
  participants: Record<'parent' | 'child', [string]>;
  child: Person<DateOrLDT>;
  parent: Person<DateOrLDT>;
  constructor(parent: Person<DateOrLDT> & {id: string}, child: Person<DateOrLDT> & {id: string}) {
    this.child = child;
    this.parent = parent;
    this.participants = {parent: [parent.id], child: [child.id]};
  }

  static fromRelation(relation: ParentRelationship, people: {[id: string]: Person<DateOrLDT> & {id: string}}): Parentship {
    if (relation.relType != 'parent') {
      throw Error('relation must be of type "parent"');
    }
    const parent = people[relation.participants.parent[0]];
    const child = people[relation.participants.child[0]];
    if (parent === undefined || child === undefined) {
      throw Error('parent or child objects are not found in provided object');
    }
    return new Parentship(parent, child);
  }
}
