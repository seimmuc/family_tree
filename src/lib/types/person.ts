import { object, string, type ObjectSchema, array, StringSchema, number } from 'yup';
import { stripNonPrintableAndNormalize } from '$lib/utils';

type OptionalKeysNullable<T extends Record<any, any>> = {
  [K in keyof T]: undefined extends T[K] ? T[K] | null : T[K];
};

export const DATE_MAX_LEN = 30;
export const PERSON_MAX_PHOTOS = 25;

const UUID = string().required().lowercase().uuid();

export type PhotoPath = string;
const PHOTO_PATH_SCHEMA: StringSchema<PhotoPath> = string().matches(/^[^/.][^/]{0,127}$/).required();

/** Must be of the following types
 * - explicit date in "YYYY-MM-DD" format
 * - "unknown" or "" if the date is unknown
 * - "none" if the date is not applicable
 */
export type DateType = string | undefined;

// Person types - Typescipt

/** Person object stored in db and returned by the server */
export interface Person {
  id: string; // UUIDv4
  name: string;
  gender?: string;
  birthDate?: DateType;
  deathDate?: DateType;
  bio?: string;
  portrait?: PhotoPath;
}

/** Equivalent to Person, but used to create a new person or other cases when the person isn't in DB yet */
export type PersonData = Omit<Person, 'id'>;

/**
 * Person update object, id must remain unchanged, all other fields should be undefined to leave them unchanged, null
 * to remove them (become undefined) or be set to the new valid value. Name cannot be null since it cannot be removed.
 */
export type UpdatablePerson = Partial<OptionalKeysNullable<PersonData>> & Pick<Person, 'id'>;

// Person types - yup schemas

export const PERSON_ID_ARRAY = array(UUID).required();
const DATE_SCHEMA = string().trim().max(DATE_MAX_LEN);

const pId = UUID.label('person id');
const pName = string()
  .min(1)
  .max(75)
  .trim()
  .transform(v => (v ? stripNonPrintableAndNormalize(v, false, true) : v))
  .required();
const pGender = string()
  .max(30)
  .trim()
  .transform(v => (v ? stripNonPrintableAndNormalize(v, false, true) : v))
  .optional();
const pBirthDate = DATE_SCHEMA.label('birth date').optional();
const pDeathDate = DATE_SCHEMA.label('death date').optional();
const pBio = string()
  .max(1000)
  .trim()
  .transform(v => (v ? stripNonPrintableAndNormalize(v, false, false) : v))
  .optional();
const pPortrait = PHOTO_PATH_SCHEMA.optional();

/** `Person` type validator */
export const PERSON_SCHEMA: ObjectSchema<Person> = object({
  id: pId,
  name: pName,
  gender: pGender,
  birthDate: pBirthDate,
  deathDate: pDeathDate,
  bio: pBio,
  portrait: pPortrait
}).noUnknown();

/** `PersonData` type validator */
export const PERSON_NEW_SCHEMA: ObjectSchema<PersonData> = PERSON_SCHEMA.omit(['id']);

/** `UpdatablePerson` type validator */
export const PERSON_UPDATE_SCHEMA: ObjectSchema<UpdatablePerson> = PERSON_SCHEMA.pick(['id'])
  .shape({
    name: pName.nonNullable().optional(),
    gender: pGender.nullable(),
    birthDate: pBirthDate.nullable(),
    deathDate: pDeathDate.nullable(),
    bio: pBio.nullable(),
    portrait: pPortrait.nullable()
  })
  .noUnknown();

export const PERSON_KEYS = Object.keys(PERSON_SCHEMA.fields);

// Photos

export interface Photo {
  id: string;
  hash: string;
  filename: PhotoPath;
  created: number;
};

export type PhotoData = Omit<Photo, 'id' | 'created'>;

export const PHOTO_ID = UUID.label('photo id');
const PHOTO_SCHEMA: ObjectSchema<Photo> = object({
  id: PHOTO_ID,
  hash: string().required(),
  filename: PHOTO_PATH_SCHEMA,
  created: number().integer().truncate().required()
});

// Relationships

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
