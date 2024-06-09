import type { User } from '$lib/types/user';
import { writable, type Writable } from 'svelte/store';

export const theme: Writable<string> = writable('');

export const userStore: Writable<User | null> = writable(null);
