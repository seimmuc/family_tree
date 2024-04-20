import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import type { PersonData, User, UserPermission } from '$lib/types';
import { clearUndefinedVals, createUrl, isDateString, stripNonPrintableAndNormalize } from '$lib/utils';
import type { Action } from 'svelte/action';

const DEFAULT_DATE_FORMAT_OPRIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC'
};

export const TRANS_DELAY = 250;

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
  dateFormatOptions ??= DEFAULT_DATE_FORMAT_OPRIONS;
  const d = new Date(dateString);
  return d.toLocaleDateString(undefined, dateFormatOptions);
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
export function getPersonChanges(original: PersonData, edits: PersonEdit): PersonChanges {
  const name = stripNonPrintableAndNormalize(edits.name, false, true);
  const bio = stripNonPrintableAndNormalize(edits.bio, false, false) || undefined;
  const bd = isDateString(edits.birthDate) ? edits.birthDate : undefined;
  const dd = isDateString(edits.deathDate) ? edits.deathDate : undefined;
  const res = {
    name: name !== original.name ? name : undefined,
    bio: bio !== original.bio ? bio ?? null : undefined,
    birthDate: bd !== original.birthDate ? bd ?? null : undefined,
    deathDate: dd !== original.deathDate ? dd ?? null : undefined
  };
  return clearUndefinedVals(res);
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
