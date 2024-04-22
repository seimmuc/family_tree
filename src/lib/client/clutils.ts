import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { PERSON_EDIT_SCHEMA, type PersonData, type User, type UserPermission } from '$lib/types';
import { clearUndefinedVals, createUrl, isDateString } from '$lib/utils';
import { err, ok, type Result } from 'neverthrow';
import type { Action } from 'svelte/action';
import { ValidationError } from 'yup';

const DEFAULT_DATE_FORMAT_OPRIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC'
};

export const TRANS_DELAY = 250;

// will change to { key: string, values: Record<string, any> } once we start using yup.setLocale()
export type YupErr = string;

export function truncateString(str: string, maxChars: number, maxLines: number): [string, boolean] {
  let result = str;
  let wasShortened = false;
  if (str.length > maxChars) {
    result = str.substring(0, maxChars);
    wasShortened = true;
  }
  const lines = result.split('\n');
  if (lines.length > maxLines) {
    result = lines.slice(0, maxLines).join('\n');
    wasShortened = true;
  }
  return [result, wasShortened];
}

export function formatDate(
  dateString?: string,
  dateType: string | undefined = undefined,
  dateFormatOptions: Intl.DateTimeFormatOptions | undefined = DEFAULT_DATE_FORMAT_OPRIONS
): string {
  if (!dateString) {
    return `unknown ${dateType ? dateType + ' ' : ''}date`;
  }
  if (!isDateString(dateString)) {
    return dateString;
  }
  dateFormatOptions ??= DEFAULT_DATE_FORMAT_OPRIONS;
  const d = new Date(dateString);
  return d.toLocaleDateString(undefined, dateFormatOptions);
}
export function timestampToFormattedTime(
  utcTimestamp: number,
  dateFormatOptions: Intl.DateTimeFormatOptions | undefined = DEFAULT_DATE_FORMAT_OPRIONS
): string {
  dateFormatOptions ??= DEFAULT_DATE_FORMAT_OPRIONS;
  const d = new Date(utcTimestamp);
  return d.toLocaleTimeString(undefined, dateFormatOptions);
}

export const nonewlines: Action<HTMLElement, undefined, { 'on:returnkey': (e: CustomEvent<KeyboardEvent>) => void }> = (
  node: HTMLElement
) => {
  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      node.dispatchEvent(new CustomEvent('returnkey', { detail: e }));
    }
  }
  function onPaste(e: ClipboardEvent) {
    const text = e.clipboardData?.getData('text');
    if (text?.includes('\n')) {
      e.preventDefault();
    }
  }
  node.addEventListener('keydown', onKeydown);
  node.addEventListener('paste', onPaste);
  return {
    destroy() {
      node.removeEventListener('keydown', onKeydown);
      node.removeEventListener('paste', onPaste);
    }
  };
};

// Person-related tools
export type PersonEdit = { name: string; birthDate: string; deathDate: string; bio: string };
export type PersonChanges = {
  name?: string;
  bio?: string | null;
  birthDate?: string | null;
  deathDate?: string | null;
};
export function toPersonEdit(person: PersonData): PersonEdit {
  return {
    name: person.name,
    birthDate: person.birthDate ?? '',
    deathDate: person.deathDate ?? '',
    bio: person.bio ?? ''
  };
}
/**
 * Returns an object with person properties that need to be changed, null value means that that property should be removed, undefined values should be ignored
 */
export function getPersonChanges(original: PersonData, edits: PersonEdit): Result<PersonChanges, YupErr> {
  try {
    const vp = PERSON_EDIT_SCHEMA.validateSync(edits);
    const res = {
      name: vp.name !== original.name ? vp.name : undefined,
      bio: vp.bio !== original.bio ? vp.bio || null : undefined,
      birthDate: vp.birthDate !== original.birthDate ? vp.birthDate || null : undefined,
      deathDate: vp.deathDate !== original.deathDate ? vp.deathDate || null : undefined
    };
    return ok(clearUndefinedVals(res));
  } catch (e) {
    if (e instanceof ValidationError) {
      return err(e.message);
    }
    throw e;
  }
}

export function photoUrl(person: PersonData): string | undefined {
  return person.photo ? `/media/${person.photo}` : undefined;
}

function userHasPermission(user: Pick<User, 'permissions'> | null, permission: UserPermission): boolean {
  if (user === null) {
    return false;
  }
  return user.permissions.includes(permission) || user.permissions.includes('admin');
}

export function redirUserChange(
  user: Pick<User, 'permissions'> | null,
  requiredPermission: UserPermission | undefined,
  currentUrl: URL,
  loginIfNoUser = true,
  noPermRedirPath = '/'
) {
  if (!browser) {
    return;
  }
  if (user === null || (requiredPermission && !userHasPermission(user, requiredPermission))) {
    const redirToLogin = user === null && loginIfNoUser;
    const targetPath = redirToLogin ? '/account/login' : noPermRedirPath || '/';
    const url = createUrl(targetPath, currentUrl, redirToLogin ? { redirectTo: currentUrl.pathname } : undefined);
    const gotoPromise = goto(url, { invalidateAll: false });
    gotoPromise.catch(() => {
      window.location.assign(url);
    });
  }
}
