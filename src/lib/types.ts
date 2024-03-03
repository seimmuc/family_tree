import { object, string, ObjectSchema } from "yup";
import { stripNonPrintableAndNormalize } from "./utils";

type OptionalKeysNullable<T extends Record<any, any>> = {
  [K in keyof T]: undefined extends T[K] ? T[K] | null : T[K];
};


export interface Person {
  id: string;
  name: string;
  gender?: string;
  birthDate?: string;   // YYYY-MM-DD
  deathDate?: string;
  bio?: string;
}

export type UpdatablePerson = OptionalKeysNullable<Person>;

export const PERSON_SCHEMA: ObjectSchema<UpdatablePerson> = object({
  id: string().required().lowercase().uuid().label('person id'),
  name: string().transform(v => stripNonPrintableAndNormalize(v, false, true)).required().min(1),
  gender: string().optional().nullable(),
  birthDate: string().matches(/^\d{4}-\d{2}-\d{2}$/).optional().nullable().label('birth date'),
  deathDate: string().matches(/^\d{4}-\d{2}-\d{2}$/).optional().nullable().label('death date'),
  bio: string().transform(v => stripNonPrintableAndNormalize(v, false, false)).optional().nullable()
}).noUnknown();

export const PERSON_KEYS = Object.keys(PERSON_SCHEMA.fields);


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
  child: Person;
  parent: Person;
  constructor(parent: Person, child: Person) {
    this.child = child;
    this.parent = parent;
    this.participants = {parent: [parent.id], child: [child.id]};
  }

  static fromRelation(relation: ParentRelationship, people: {[id: string]: Person}): Parentship {
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
  partners: Person[] = [];
  constructor(partners: Person[]) {
    this.partners = partners;
    this.participants = {partner: partners.map(p => p.id)};
  }

  static fromRelation(relation: PartnerRelationship, people: {[id: string]: Person}): Partnership {
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

export function toRelationshipClass(relation: Relationship, people: {[id: string]: Person}): RelationshipCl {
  if (relation.relType === 'parent') {
    return Parentship.fromRelation(relation as ParentRelationship, people);
  }
  if (relation.relType === 'partner') {
    return Partnership.fromRelation(relation as PartnerRelationship, people);
  }
  throw new Error(`unknown relation type "${relation.relType}"`);
}
