export function clearEmptyVals(object: Record<string, any>): Record<string, any> {
  return Object.fromEntries(Object.entries(object).filter(([k, v]) => v != undefined && v != null));
}

export function clearKeys(object: Record<string, any>, keys: string[]): Record<string, any> {
  return Object.fromEntries(Object.entries(object).filter(([k, v]) => !keys.includes(k)));
}

export function isUUID(str: string): boolean {
  return /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(str);
}
