import { object, string, type ObjectSchema, boolean, array, number as yupnumber, type StringSchema } from 'yup';
import type { InferType, AnyObject } from 'yup';
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

export const DATE_MAX_LEN = 30;
const DATE_SCHEMA = string().trim().max(DATE_MAX_LEN).optional().nullable();
export const PERSON_SCHEMA: ObjectSchema<UpdatablePerson> = object({
  id: personId.label('person id'),
  name: string()
    .min(1)
    .max(75)
    .trim()
    .transform(v => stripNonPrintableAndNormalize(v, false, true))
    .optional()
    .nonNullable(),
  gender: string()
    .max(30)
    .trim()
    .transform(v => stripNonPrintableAndNormalize(v, false, true))
    .optional()
    .nullable(),
  birthDate: DATE_SCHEMA.label('birth date'),
  deathDate: DATE_SCHEMA.label('death date'),
  bio: string()
    .max(1000)
    .trim()
    .transform(v => stripNonPrintableAndNormalize(v, false, false))
    .optional()
    .nullable(),
  photo: string()
    .matches(/^[^/.][^/]{0,127}$/)
    .optional()
    .nullable()
}).noUnknown();
export const PERSON_EDIT_SCHEMA = PERSON_SCHEMA.pick(['name', 'bio', 'birthDate', 'deathDate']);

// TODO temporary, re-DRY this later
export const PERSON_NEW_SCHEMA: ObjectSchema<PersonData> = object({
  name: string()
    .min(1)
    .max(75)
    .trim()
    .transform(v => stripNonPrintableAndNormalize(v, false, true))
    .required(),
  gender: string()
    .max(30)
    .trim()
    .transform(v => stripNonPrintableAndNormalize(v, false, true))
    .optional(),
  birthDate: DATE_SCHEMA.label('birth date').nonNullable(),
  deathDate: DATE_SCHEMA.label('death date').nonNullable(),
  bio: string()
    .max(1000)
    .trim()
    .transform(v => stripNonPrintableAndNormalize(v, false, false))
    .optional(),
  photo: string()
    .matches(/^[^/.][^/]{0,127}$/)
    .optional()
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

export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'ru', name: 'Русский' }
] as const;
export type LangCode = (typeof LANGUAGES)[number]['code'];

export type UserID = UUID;
export type UserOptions = { language?: LangCode };

export const USER_OPTIONS_SCHEMA = object({
  language: string()
    .oneOf(LANGUAGES.map(l => l.code))
    .optional()
}).noUnknown();
export const USER_OPTIONS_UPDATE_SCHEMA = USER_OPTIONS_SCHEMA.partial();

export const DEFAULT_USER_OPTIONS: Required<UserOptions> = { language: 'en' };

// UserMinimal is the minimal representation of a user and should be safe to send to other users and unauthenticated clients when appropriate
export type UserMinimal = { id: UserID; username: string };
// own User object can be safely sent to authenticated client
export type User = UserMinimal & { creationTime: number; permissions: UserPermission[]; options: UserOptions };
// UserDB represents user's database object and should never be sent to the client, not even the currently signed-in user's own object
export type UserDB = User & { passwordHash: string };

export const USER_ID_SCHEMA = string().uuid().required() as StringSchema<UUID, AnyObject, undefined, ''>;
export const USER_PERMISSION_SCHEMA = string().required().oneOf(USER_PERMISSIONS);
export const USER_SCHEMA: ObjectSchema<User> = object({
  id: USER_ID_SCHEMA,
  username: string().required().min(2).max(32),
  creationTime: yupnumber().required(),
  permissions: array(USER_PERMISSION_SCHEMA).required(),
  options: USER_OPTIONS_SCHEMA
}).noUnknown();

export type UserPermChanges = { perm: UserPermission; change: 'add' | 'del' }[];
export type UserPermChangesReq = { user: UserID; changes: UserPermChanges };
