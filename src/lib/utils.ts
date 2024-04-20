import { err, ok, type Result } from 'neverthrow';
import type { Person } from './types';

export function clearUndefinedVals(object: Record<string, any>): Record<string, any> {
  return Object.fromEntries(Object.entries(object).filter(([k, v]) => v !== undefined));
}
export function clearEmptyVals(object: Record<string, any>): Record<string, any> {
  return Object.fromEntries(Object.entries(object).filter(([k, v]) => v !== undefined && v !== null));
}

export function clearKeys(object: Record<string, any>, keys: string[]): Record<string, any> {
  return Object.fromEntries(Object.entries(object).filter(([k, v]) => !keys.includes(k)));
}
export function hasAnyKey(object: Record<string, any>, keys: string[]): boolean {
  return Object.keys(object).some(k => keys.includes(k));
}
export function arrayHasAny<T>(array: Array<T>, elements: Array<T>): boolean {
  return elements.some(e => array.includes(e));
}
export function arrayFilterInPlace<T>(array: T[], predicate: (value: T, index: number, array: T[]) => boolean) {
  // this function is loosely based on https://stackoverflow.com/a/37319954/22374935 (CC BY-SA 3.0)
  let ni = 0;
  for (let i = 0; i < array.length; i++) {
    if (predicate(array[i], i, array)) {
      array[ni++] = array[i];
    }
  }
  array.length = ni;
}

export function titleCaseWord<S extends string | undefined>(word: S): S {
  if (word === undefined || word.length < 1) {
    return word;
  }
  return (word.charAt(0).toUpperCase() + word.slice(1)) as S;
}

/**
 * Removes non-printable characters from string and normalizes newline and space characters (to unix newlines and ascii space)
 *
 * Note: this function was shamelessly stolen from https://stackoverflow.com/a/71459391/22374935 (CC BY-SA 4.0) and then modifified
 * @param text input string to be processed
 * @param stripSurrogatesAndFormats keep certain characters, such as ones used for combined marks and emojis
 * @returns processed string with unwanted characters stripped out
 */
export function stripNonPrintableAndNormalize(
  text: string,
  stripSurrogatesAndFormats: boolean = false,
  stripNewline: boolean = false
): string {
  // strip control chars. optionally, keep surrogates and formats
  if (stripSurrogatesAndFormats) {
    if (stripNewline) {
      text = text.replace(/\p{C}/gu, '');
    } else {
      text = text.replace(/[^\P{C}\n]/gu, '');
    }
  } else {
    if (stripNewline) {
      text = text.replace(/\p{Cc}/gu, '');
    } else {
      text = text.replace(/[^\P{Cc}\n]/gu, '');
    }
    text = text.replace(/\p{Co}|\p{Cn}/gu, '');
  }
  // normalize newline and space
  text = text.replace(/\r\n|\p{Zl}|\p{Zp}/gu, '\n').replace(/\p{Zs}/gu, ' ');
  return text.trim();
}

export function validateUsername(username: string): Result<void, string> {
  // https://unicode.org/reports/tr18/#General_Category_Property
  // may consider using \p{Alphabetic} instead of \p{Letter} in the future
  // \p{Mark} (combining marks) and most \p{Punctuation} is currently explicitly prohibited in usernames
  if (!(typeof username === 'string')) {
    return err('invalid username');
  }
  if (username.length > 32) {
    return err('username is too long');
  }
  if (!/^[\p{Letter}\p{Number}_.\(\)\[\]\-]+$/v.test(username)) {
    return err('username contains prohibited characters');
  }
  if (username.length < 2) {
    return err('username is too short');
  }
  return ok(undefined);
}
export function validatePassword(password: string): Result<void, string> {
  if (!(typeof password === 'string')) {
    return err('invalid password');
  }
  if (password.length > 64) {
    return err('password is too long');
  }
  if (!/^[^\p{Control}\p{Private_Use}\p{Unassigned}]+$/v.test(password)) {
    return err('password contains prohibited characters');
  }
  if (password.length < 8) {
    return err('password is too short');
  }
  return ok(undefined);
}

export function validateUsernameAndPassword(
  formData: FormData,
  uKey = 'username',
  pKey = 'password'
): Result<[string, string], string> {
  const username = formData.get(uKey) as string;
  const usernameValidResult = validateUsername(username);
  if (usernameValidResult.isErr()) {
    return err(usernameValidResult.error);
  }
  const password = formData.get(pKey) as string;
  const passwordValidResult = validatePassword(password);
  if (passwordValidResult.isErr()) {
    return err(passwordValidResult.error);
  }
  return ok([username, password]);
}

export function dateToString(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDay()).padStart(2, '0')}`;
}
export function dateFromString(dateString: string): Date | null {
  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match === null ? null : new Date(match[0]);
}

export function isDateString(dateString?: string): boolean {
  if (dateString === undefined) {
    return false;
  }
  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match === null) {
    return false;
  }
  const [month, date] = [parseInt(match[2]), parseInt(match[3])];
  return month !== undefined && month > 0 && month <= 12 && date !== undefined && date > 0 && date <= 31;
}
export function isUUID(str: string): boolean {
  return /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(str);
}

export function peopleToIdArray(people: Person[]): string[] {
  return people.map(p => p.id);
}

export function createUrl(
  url: string,
  base: URL,
  searchParams: Record<string, string> | URLSearchParams | undefined
): URL {
  const result = new URL(url, base);
  if (searchParams !== undefined) {
    if (searchParams instanceof URLSearchParams) {
      searchParams.forEach((val, name) => {
        result.searchParams.append(name, val);
      });
    } else {
      Object.entries(searchParams).forEach(([name, val]) => {
        result.searchParams.append(name, val);
      });
    }
  }
  return result;
}
