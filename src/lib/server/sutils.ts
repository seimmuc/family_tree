import { PERSON_NEW_SCHEMA, PERSON_SCHEMA, RELATIVES_SINGLE_TYPE_CHANGE_SCHEMA } from '$lib/types';
import type { PersonData, RelativesChangeRequest, UpdatablePerson, UserPermission } from '$lib/types';
import { ValidationError } from 'yup';
import { type Result, err, ok } from 'neverthrow';
import { createUrl } from '$lib/utils';
import type { User } from '$lib/types';
import { USERS_ADMINS } from '$env/static/private';
import { error, redirect } from '@sveltejs/kit';

export type FailError = { code: number; message: string };

const ADMINISTRATORS = parseConfigList(USERS_ADMINS);

const configBools: Record<string, boolean> = { true: true, false: false, yes: true, no: false, y: true, n: false };
export function parseConfigBool(configValue: string | undefined, def: boolean = false): boolean {
  if (configValue === undefined) {
    return def;
  }
  return configBools[configValue.trim().toLowerCase()] ?? def;
}
export function parseConfigList(configValue: string | undefined, splitOnComma = true): string[] {
  if (configValue === undefined) {
    return [];
  }
  configValue = configValue.trim();
  if (configValue[0] === '[' && configValue[configValue.length - 1] === ']') {
    return JSON.parse(configValue);
  }
  if (configValue.length < 1) {
    return [];
  }
  if (splitOnComma && configValue.includes(',')) {
    return configValue.split(',').map(s => s.trim());
  }
  return [configValue];
}

export function parseUpdatePerson(updateJson?: FormDataEntryValue | null): Result<UpdatablePerson, FailError> {
  if (typeof updateJson !== 'string') {
    return err({ code: 422, message: 'missing person update data' });
  }
  let dangerousPerson: { [k: string]: any };
  try {
    dangerousPerson = JSON.parse(updateJson);
    if (typeof dangerousPerson !== 'object') {
      throw new Error();
    }
  } catch {
    return err({ code: 422, message: 'invalid json' });
  }
  try {
    return ok(PERSON_SCHEMA.validateSync(dangerousPerson, { abortEarly: true, stripUnknown: true }));
  } catch (error) {
    if (error instanceof ValidationError) {
      return err({ code: 422, message: error.message });
    }
    throw error;
  }
}

export function parseNewPerson(dataJson?: FormDataEntryValue | null): Result<PersonData, FailError> {
  if (typeof dataJson !== 'string') {
    return err({ code: 422, message: 'missing new person data' });
  }
  let dangerousPerson: { [k: string]: any };
  try {
    dangerousPerson = JSON.parse(dataJson);
    if (typeof dangerousPerson !== 'object') {
      throw new Error();
    }
  } catch {
    return err({ code: 422, message: 'invalid json' });
  }
  try {
    return ok(PERSON_NEW_SCHEMA.validateSync(dangerousPerson, { abortEarly: true, stripUnknown: true }));
  } catch (error) {
    if (error instanceof ValidationError) {
      return err({ code: 422, message: error.message });
    }
    throw error;
  }
}

export function parseUpdateRelatives(
  updateJson: FormDataEntryValue | null,
  personId: string
): Result<RelativesChangeRequest, FailError> {
  if (typeof updateJson !== 'string') {
    return err({ code: 422, message: 'missing relatives update data' });
  }
  let dangerReq: RelativesChangeRequest;
  try {
    dangerReq = JSON.parse(updateJson);
    if (typeof dangerReq !== 'object') {
      throw new Error();
    }
  } catch {
    return err({ code: 400, message: 'invalid json' });
  }
  try {
    const res = Object.fromEntries(
      Object.entries(dangerReq).map(([k, v]) => [
        k,
        RELATIVES_SINGLE_TYPE_CHANGE_SCHEMA.validateSync(v, { abortEarly: true, stripUnknown: true })
      ])
    );
    for (const ch of Object.values(res)) {
      if (ch.added.includes(personId) || ch.removed.includes(personId)) {
        return err({ code: 422, message: 'circular relations are not allowed' });
      }
      for (const rid of ch.removed) {
        if (ch.added.includes(rid)) {
          return err({ code: 422, message: 'conflicting relation directives' });
        }
      }
    }
    return ok(res);
  } catch (error) {
    if (error instanceof ValidationError) {
      return err({ code: 422, message: error.message });
    }
    throw error;
  }
}

export function addConfigAdmin<U extends User>(user: U): U {
  if (ADMINISTRATORS.includes(user.username) && !user.permissions.includes('admin')) {
    user.permissions.push('admin');
  }
  return user;
}

export function userHasPermission(user: User | null, permission: UserPermission): boolean {
  if (user === null) {
    return false;
  }
  if (ADMINISTRATORS.includes(user.username)) {
    return true;
  }
  return user.permissions.includes(permission) || user.permissions.includes('admin');
}

export function userLoginRedirOrErrorIfNotAuthorized(
  user: User | null,
  permission: UserPermission | null,
  curUrl: URL,
  errorMsg?: string
) {
  if (permission === null ? user === null : !userHasPermission(user, permission)) {
    if (user === null) {
      redirect(302, createUrl('/account/login', curUrl, { redirectTo: curUrl.pathname }));
    }
    error(403, { message: errorMsg ?? 'Unauthorized' });
    throw new Error('this should never happen');
  }
}
