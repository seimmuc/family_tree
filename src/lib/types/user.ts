import type { UUID } from 'crypto';
import { ObjectSchema, StringSchema, number as yupnumber, object, string, type AnyObject, array } from 'yup';

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

/** UserMinimal is the minimal representation of a user and should be safe to send to other users and unauthenticated clients when appropriate */
export type UserMinimal = { id: UserID; username: string };
/** User object can be safely sent to own authenticated client or admin */
export type User = UserMinimal & { creationTime: number; permissions: UserPermission[]; options: UserOptions };
/** UserDB represents user's database object and should never be sent to the client, not even the currently signed-in user's own object */
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
