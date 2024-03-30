import type { ComponentType } from 'svelte';
import { writable } from 'svelte/store';

export function load({ data }) {
  const dynamicMenu = writable({
    comp: undefined as ComponentType | undefined,
    compProps: {} as Record<string, any>
  });
  return { dynamicMenu, ...data };
}
