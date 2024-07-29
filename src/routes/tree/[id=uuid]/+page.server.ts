import { ReadActions, WriteActions } from '$lib/server/graph/person.js';
import { error, type Actions, fail } from '@sveltejs/kit';
import { parseUpdatePerson, userHasPermission, userLoginRedirOrErrorIfNotAuthorized } from '$lib/server/sutils.js';

export async function load({ params, locals, url }) {
  userLoginRedirOrErrorIfNotAuthorized(locals.user, 'view', url);
  const canEdit = userHasPermission(locals.user, 'edit');
  const [focusPeopleIds, [people, relations]] = await ReadActions.perform(async act => {
    const focusPerson = await act.findPersonById(params.id);
    if (focusPerson === undefined) {
      return error(404);
    }
    const partner = await act.findMainPartner(focusPerson.id);
    const partnerIds = [focusPerson.id, partner?.id].filter(v => v !== undefined) as string[] & { length: 1 | 2 };
    return [partnerIds, await act.findFamily(partnerIds, 2)];
  });

  // get all child IDs and list of their parents
  const chMap: Record<string, string[]> = {};
  for (const rel of relations) {
    if (rel.relType === 'parent' && focusPeopleIds.includes(rel.participants.parent[0])) {
      (chMap[rel.participants.child[0]] ??= []).push(rel.participants.parent[0]);
    }
  }
  // filter children into groups based on their parents
  const children = { shared: [] as string[], other: {} as Record<string, string[]> };
  for (const [childId, parentIds] of Object.entries(chMap)) {
    if (parentIds.length === focusPeopleIds.length) {
      children.shared.push(childId);
    } else {
      (children.other[parentIds[0]] ??= []).push(childId);
    }
  }

  // get all parents of each focus person
  const parents: Record<string, string[]> = {};
  for (const rel of relations) {
    if (rel.relType === 'parent' && focusPeopleIds.includes(rel.participants.child[0])) {
      (parents[rel.participants.child[0]] ??= []).push(rel.participants.parent[0]);
    }
  }

  return { focusPeopleIds, people, relations, children, parentsOf: parents, canEdit };
}

export const actions: Actions = {
  updatePerson: async ({ request, locals }) => {
    if (!userHasPermission(locals.user, 'edit')) {
      return fail(403, { message: 'unauthorized' });
    }
    const data = await request.formData();
    const personUpdate = parseUpdatePerson(data.get('person-update'));
    if (personUpdate.isErr()) {
      return fail(personUpdate.error.code, { message: personUpdate.error.message });
    }
    const updatedPerson = await WriteActions.perform(async act => {
      return act.updatePerson(personUpdate.value);
    });
  }
};
