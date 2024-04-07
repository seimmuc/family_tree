import { object, string, ObjectSchema, type InferType, boolean, array } from 'yup';
import { stripNonPrintableAndNormalize } from './utils';
import type { UUID } from 'crypto';

export const THEMES = ['light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];

export function isTheme(theme: string | undefined): boolean {
  return THEMES.includes(theme as Theme);
}
export function getTheme(theme: string | undefined): Theme {
  return THEMES.includes(theme as Theme) ? (theme as Theme) : THEMES[0];
}

type OptionalKeysNullable<T extends Record<any, any>> = {
  [K in keyof T]: undefined extends T[K] ? T[K] | null : T[K];
};

const personId = string().required().lowercase().uuid();
const personIdArr = array(personId).required();

export interface Person {
  id: string;
  name: string;
  gender?: string;
  birthDate?: string; // YYYY-MM-DD
  deathDate?: string;
  bio?: string;
  photo?: string;
}

export type PersonData = Omit<Person, 'id'>;
export type UpdatablePerson = Partial<OptionalKeysNullable<PersonData>> & Pick<Person, 'id'>;

export const PERSON_SCHEMA: ObjectSchema<UpdatablePerson> = object({
  id: personId.label('person id'),
  name: string()
    .transform(v => stripNonPrintableAndNormalize(v, false, true).trim())
    .min(1)
    .optional()
    .nonNullable(),
  gender: string().optional().nullable(),
  birthDate: string()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable()
    .label('birth date'),
  deathDate: string()
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable()
    .label('death date'),
  bio: string()
    .transform(v => stripNonPrintableAndNormalize(v, false, false))
    .optional()
    .nullable(),
  photo: string()
    .matches(/^[^/.][^/]*$/)
    .optional()
    .nullable()
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
    this.participants = { parent: [parent.id], child: [child.id] };
  }

  static fromRelation(relation: ParentRelationship, people: { [id: string]: Person }): Parentship {
    if (relation.relType !== 'parent') {
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
    this.participants = { partner: partners.map(p => p.id) };
  }

  static fromRelation(relation: PartnerRelationship, people: { [id: string]: Person }): Partnership {
    if (relation.relType !== 'partner') {
      throw Error('relation must be of type "partner"');
    }
    const partners = relation.participants['partner'].map(id => {
      if (id in people) {
        return people[id];
      }
      throw Error('partner object was not found in provided people object');
    });
    return new Partnership(partners);
  }
}
export type RelationshipCl = Parentship | Partnership;

export function toRelationshipClass(relation: Relationship, people: { [id: string]: Person }): RelationshipCl {
  if (relation.relType === 'parent') {
    return Parentship.fromRelation(relation as ParentRelationship, people);
  }
  if (relation.relType === 'partner') {
    return Partnership.fromRelation(relation as PartnerRelationship, people);
  }
  throw new Error(`unknown relation type "${relation.relType}"`);
}

export const SEARCH_QUERY_SCHEMA = object({
  nameQuery: string().required().min(2).lowercase().trim(),
  nameComplete: boolean().default(false).optional()
});

export type SearchQuery = InferType<typeof SEARCH_QUERY_SCHEMA>;
export type SearchQueryCl = Partial<SearchQuery> & Required<Pick<SearchQuery, 'nameQuery'>>;

export const RELATIVES_SINGLE_TYPE_CHANGE_SCHEMA = object({
  added: personIdArr,
  removed: personIdArr
}).noUnknown();

export type RelativesSingleTypeChange = InferType<typeof RELATIVES_SINGLE_TYPE_CHANGE_SCHEMA>;
export type RelativesChangeRequest = { [relType: string]: RelativesSingleTypeChange };

export const USER_PERMISSIONS = ['view', 'edit', 'admin'] as const;
export type UserPermission = (typeof USER_PERMISSIONS)[number];

export type UserID = UUID;
// UserMinimal is the minimal representation of a user and should be safe to send to other users and unauthenticated clients when appropriate
export type UserMinimal = { id: UserID; username: string };
// own User object can be safely sent to authenticated client
export type User = UserMinimal & { creationTime: number; permissions: UserPermission[] };
// UserDB represents user's database object and should never be sent to the client, not even the currently signed-in user's own object
export type UserDB = User & { passwordHash: string };
// Future use
export type UserOptions = {};
