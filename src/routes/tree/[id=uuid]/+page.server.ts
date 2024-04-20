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
    const partnerIds = [focusPerson.id, partner?.id].filter(v => v !== undefined) as string[];
    return [partnerIds, await act.findFamily(partnerIds, 2)];
  });

  // get all child IDs and list of their parents
  const children: Record<string, string[]> = {};
  for (const rel of relations) {
    if (rel.relType === 'parent' && focusPeopleIds.includes(rel.participants.parent[0])) {
      (children[rel.participants.child[0]] ??= []).push(rel.participants.parent[0]);
    }
  }
  // filter children to only include ones that are children of all people in focusPeopleIds
  const sharedChildren = Object.entries(children)
    .filter(([_, pIds]) => focusPeopleIds.every(id => pIds.includes(id)))
    .map(([cId, _]) => cId);

  // get all parents of each focus person
  const parents: Record<string, string[]> = {};
  for (const rel of relations) {
    if (rel.relType === 'parent' && focusPeopleIds.includes(rel.participants.child[0])) {
      (parents[rel.participants.child[0]] ??= []).push(rel.participants.parent[0]);
    }
  }

  return { focusPeopleIds, people, relations, children: sharedChildren, parentsOf: parents, canEdit };
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
