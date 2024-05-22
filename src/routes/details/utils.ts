import type { RelativesChangeRequest } from '$lib/types/reqdata';
import { peopleToIdArray } from '$lib/utils';
import type RelSection from './RelSection.svelte';

function addRelChanges<RT extends string>(chReq: RelativesChangeRequest<RT>, relType: RT, section: RelSection): void {
  const diffs = section.differences();
  if (diffs.added.length > 0 || diffs.removed.length > 0) {
    chReq[relType] = { added: peopleToIdArray(diffs.added), removed: peopleToIdArray(diffs.removed) };
  }
}

export function createRelChangeRequest<RT extends string>(sections: [RT, RelSection][]): RelativesChangeRequest<RT> {
  const chReq: RelativesChangeRequest<RT> = {};
  for (const s of sections) {
    addRelChanges(chReq, s[0], s[1]);
  }
  return chReq;
}
