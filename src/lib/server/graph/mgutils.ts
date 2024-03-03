import type { Person, UpdatablePerson } from "$lib/types";
import { LocalDateTime } from "neo4j-driver";

type DateToLDT<T> = T extends Date ? LocalDateTime<number> : T;
type ObjLDT<T extends Record<string, unknown>> = {[key in keyof T]: DateToLDT<T[key]>};
type LDTToDate<T> = T extends LocalDateTime ? Date : T;
type ObjDate<T extends Record<string, unknown>> = {[key in keyof T]: LDTToDate<T[key]>};

export function toLocalDateTime<T extends Record<string, unknown>>(obj: T): ObjLDT<T> {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, v instanceof Date ? LocalDateTime.fromStandardDate(v) : v])) as ObjLDT<T>;
}

export function toJSDate<T extends Record<string, unknown>>(obj: T): ObjDate<T> {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, v instanceof LocalDateTime ? v.toStandardDate() : v])) as ObjDate<T>;
}
