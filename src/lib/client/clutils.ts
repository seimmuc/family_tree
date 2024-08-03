import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { PUBLIC_UNAUTHENTICATED_PERMISSIONS } from '$env/static/public';
import { PERSON_UPDATE_SCHEMA, type DateType, type PersonData, type PhotoPath } from '$lib/types/person';
import type { User, UserPermission } from '$lib/types/user';
import { clearUndefinedVals, createUrl, isDateString, parseConfigList } from '$lib/utils';
import * as he from 'he';
import { err, ok, type Result } from 'neverthrow';
import type { Action } from 'svelte/action';
import { ValidationError } from 'yup';
import * as m from '$lib/paraglide/messages.js';
import type { Readable } from 'svelte/store';

const UNAUTH_PERMS = parseConfigList(PUBLIC_UNAUTHENTICATED_PERMISSIONS);

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
  dateString?: DateType,
  dateType: 'birth' | 'death' | undefined = undefined,
  dateFormatOptions: Intl.DateTimeFormatOptions | undefined = DEFAULT_DATE_FORMAT_OPRIONS
): string {
  if (dateString === 'none') {
    return '';
  }
  if (dateString === undefined || dateString.length < 1 || dateString === 'unknown') {
    switch (dateType) {
      case 'birth':
        return m.sharedUnknownDateBirth();
      case 'death':
        return m.sharedUnknownDateDeath();
      default:
        return m.sharedUnknownDate();
    }
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

export function escapeHtml(htmlString: string): string {
  return he.escape(htmlString);
}

export function onStoreValChange<T>(store: Readable<T>, callback: (newValue: T) => void): () => void {
  let initVal = true;
  return store.subscribe(newVal => {
    if (initVal) {
      initVal = false;
    } else {
      callback(newVal);
    }
  });
}

// Person-related tools
export type PersonEdit = { name: string; birthDate: string; deathDate: string; bio: string };
const PERSON_EDIT_SCHEMA = PERSON_UPDATE_SCHEMA.pick(['name', 'birthDate', 'deathDate', 'bio']);
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
      bio: vp.bio !== (original.bio ?? '') ? vp.bio || null : undefined,
      birthDate: vp.birthDate !== (original.birthDate ?? '') ? vp.birthDate || null : undefined,
      deathDate: vp.deathDate !== (original.deathDate ?? '') ? vp.deathDate || null : undefined
    };
    return ok(clearUndefinedVals(res));
  } catch (e) {
    if (e instanceof ValidationError) {
      return err(e.message);
    }
    throw e;
  }
}

export function photoUrl(photoPath: PhotoPath): string {
  return `/media/${photoPath}`;
}
export function portraitUrl(person: PersonData): string | undefined {
  return person.portrait ? photoUrl(person.portrait) : undefined;
}

export function userHasPermission(user: Pick<User, 'permissions'> | null, permission: UserPermission): boolean {
  if (UNAUTH_PERMS.includes(permission)) {
    return true;
  }
  if (user === null) {
    return false;
  }
  return user.permissions.includes(permission) || user.permissions.includes('admin');
}

export function redirUserChange(
  user: Pick<User, 'permissions'> | null,
  requiredPermission: UserPermission,
  currentUrl: URL,
  loginIfNoUser = true,
  noPermRedirPath = '/'
) {
  if (!browser) {
    return;
  }
  if (userHasPermission(user, requiredPermission)) {
    return;
  }
  if (user === null && loginIfNoUser) {
    redirToLogin(currentUrl);
  }
  gotoUrl(createUrl(noPermRedirPath || '/', currentUrl, undefined));
}

export function redirToLogin(currentUrl: URL) {
  gotoUrl(createUrl('/account/login', currentUrl, { redirectTo: currentUrl.pathname }));
}

export function gotoUrl(url: URL) {
  const gotoPromise = goto(url, { invalidateAll: false });
  gotoPromise.catch(() => {
    window.location.assign(url);
  });
}
