import { err, ok, type Result } from 'neverthrow';
import { DEFAULT_USER_OPTIONS, type LangCode, type UserOptions } from './types/user';
import type { Person } from './types/person';
import * as m from '$lib/paraglide/messages.js';

export type ExcludeVals<T, E> = { [K in keyof T]: Exclude<T[K], E> };

export function clearUndefinedVals<T extends Record<string, any>>(object: T): ExcludeVals<T, undefined> {
  return Object.fromEntries(Object.entries(object).filter(([k, v]) => v !== undefined)) as ExcludeVals<T, undefined>;
}
export function clearEmptyVals<T extends Record<string, any>>(object: T): ExcludeVals<T, undefined | null> {
  return Object.fromEntries(Object.entries(object).filter(([k, v]) => v !== undefined && v !== null)) as ExcludeVals<
    T,
    undefined | null
  >;
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

export function clampNum(number: number, min: number, max: number): number {
  return Math.min(Math.max(number, min), max);
}
export function minAndMax(nums: number[]): [number, number] {
  if (nums.length < 1) {
    return [NaN, NaN];
  }
  let min = nums[0];
  let max = nums[0];
  for (let i = 1; i < nums.length; i++) {
    if (nums[i] < min) {
      min = nums[i];
    }
    if (nums[i] > max) {
      max = nums[i];
    }
  }
  return [min, max];
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

export function validateUsername(username: string, errLangCode?: LangCode): Result<void, string> {
  // https://unicode.org/reports/tr18/#General_Category_Property
  // may consider using \p{Alphabetic} instead of \p{Letter} in the future
  // \p{Mark} (combining marks) and most \p{Punctuation} is currently explicitly prohibited in usernames
  if (!(typeof username === 'string')) {
    return err(m.errUnameInvalid(undefined, { languageTag: errLangCode }));
  }
  if (username.length > 32) {
    return err(m.errUnameLong(undefined, { languageTag: errLangCode }));
  }
  if (!/^[\p{Letter}\p{Number}_.\(\)\[\]\-]+$/v.test(username)) {
    return err(m.errUnameBadChars(undefined, { languageTag: errLangCode }));
  }
  if (username.length < 2) {
    return err(m.errUnameShort(undefined, { languageTag: errLangCode }));
  }
  return ok(undefined);
}
export function validatePassword(password: string, errLangCode?: LangCode): Result<void, string> {
  if (!(typeof password === 'string')) {
    return err(m.errPassInvalid(undefined, { languageTag: errLangCode }));
  }
  if (password.length > 64) {
    return err(m.errPassLong(undefined, { languageTag: errLangCode }));
  }
  if (!/^[^\p{Control}\p{Private_Use}\p{Unassigned}]+$/v.test(password)) {
    return err(m.errPassBadChars(undefined, { languageTag: errLangCode }));
  }
  if (password.length < 8) {
    return err(m.errPassShort(undefined, { languageTag: errLangCode }));
  }
  return ok(undefined);
}

export function validateUsernameAndPassword(
  formData: FormData,
  uKey = 'username',
  pKey = 'password',
  errLangCode?: LangCode
): Result<[string, string], string> {
  const username = formData.get(uKey) as string;
  const usernameValidResult = validateUsername(username, errLangCode);
  if (usernameValidResult.isErr()) {
    return err(usernameValidResult.error);
  }
  const password = formData.get(pKey) as string;
  const passwordValidResult = validatePassword(password, errLangCode);
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

export function isDateString(dateString: string | undefined): boolean {
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

export function getUserOption<K extends keyof UserOptions>(o: UserOptions, key: K): NonNullable<UserOptions[K]> {
  return o[key] ?? DEFAULT_USER_OPTIONS[key];
}

export function toFullUserOptions(o: UserOptions): Required<UserOptions> {
  return Object.assign({}, DEFAULT_USER_OPTIONS, o);
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

export async function sha256DigestArrBuf(arrayBuffer: ArrayBuffer): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}
export async function sha256DigestFile(file: File): Promise<string> {
  return sha256DigestArrBuf(await file.arrayBuffer());
}
