import type { Integer, LocalDateTime } from "neo4j-driver";

export type DateOrLDT = Date | LocalDateTime<number | Integer>;

export interface Person<DT extends DateOrLDT = Date> {
  id: string;
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
export interface PartnerRelationship extends Relationship {
  relType: 'partner';
  participants: Record<'partner', string[]>;
}

export class Parentship implements ParentRelationship {
  relType: 'parent' = 'parent';
  participants: Record<'parent' | 'child', [string]>;
  child: Person<DateOrLDT>;
  parent: Person<DateOrLDT>;
  constructor(parent: Person<DateOrLDT>, child: Person<DateOrLDT>) {
    this.child = child;
    this.parent = parent;
    this.participants = {parent: [parent.id], child: [child.id]};
  }

  static fromRelation(relation: ParentRelationship, people: {[id: string]: Person<DateOrLDT>}): Parentship {
    if (relation.relType != 'parent') {
      throw Error('relation must be of type "parent"');
    }
    const parent = people[relation.participants.parent[0]];
    const child = people[relation.participants.child[0]];
    if (parent === undefined || child === undefined) {
      throw Error('parent or child objects are not found in provided people object');
    }
    return new Parentship(parent, child);
  }
}
export class Partnership implements PartnerRelationship {
  relType: 'partner' = 'partner';
  participants: Record<'partner', string[]>;
  partners: Person<DateOrLDT>[] = [];
  constructor(partners: Person<DateOrLDT>[]) {
    this.partners = partners;
    this.participants = {partner: partners.map(p => p.id)};
  }

  static fromRelation(relation: PartnerRelationship, people: {[id: string]: Person<DateOrLDT>}): Partnership {
    if (relation.relType != 'partner') {
      throw Error('relation must be of type "partner"');
    }
    const partners = relation.participants['partner'].map(id => {
      if (id in people) {
        return people[id]
      }
      throw Error('partner object was not found in provided people object');
    });
    return new Partnership(partners);
  }
}
export type RelationshipCl = Parentship | Partnership;

export function toRelationshipClass(relation: Relationship, people: {[id: string]: Person<DateOrLDT>}): RelationshipCl {
  if (relation.relType === 'parent') {
    return Parentship.fromRelation(relation as ParentRelationship, people);
  }
  if (relation.relType === 'partner') {
    return Partnership.fromRelation(relation as PartnerRelationship, people);
  }
  throw new Error(`unknown relation type "${relation.relType}"`);
}
