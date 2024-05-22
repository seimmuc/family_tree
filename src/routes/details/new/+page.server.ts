import {
  parseNewPerson,
  parseUpdateRelatives,
  userHasPermission,
  userLoginRedirOrErrorIfNotAuthorized
} from '$lib/server/sutils';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types.js';
import { WriteActions } from '$lib/server/graph/person.js';
import type { RelativesChangeRequest } from '$lib/types/reqdata.js';

export async function load({ locals, url }) {
  userLoginRedirOrErrorIfNotAuthorized(locals.user, 'edit', url);
  return {};
}

export const actions: Actions = {
  default: async ({ request, locals }) => {
    if (!userHasPermission(locals.user, 'edit')) {
      return fail(403, { message: 'unauthorized' });
    }

    const data = await request.formData();
    const npRes = parseNewPerson(data.get('person-new'));
    if (npRes.isErr()) {
      return fail(npRes.error.code, { message: npRes.error.message });
    }
    const newPersonData = npRes.value;

    const relRes = parseUpdateRelatives(data.get('relatives-new'));
    if (relRes.isErr()) {
      return fail(relRes.error.code, { message: relRes.error.message });
    }
    const relUpd: RelativesChangeRequest<'parents' | 'children'> = relRes.value;

    const person = await WriteActions.perform(async act => {
      // create person
      const newPerson = await act.addPerson(newPersonData);

      // add relations
      const { parents, children } = relUpd;
      if (parents !== undefined) {
        for (const prId of parents.added) {
          await act.addPersonRelation(newPerson.id, prId, 'PARENT');
        }
        for (const prId of parents.removed) {
          await act.delPersonRelation(newPerson.id, prId, 'PARENT');
        }
      }
      if (children !== undefined) {
        for (const chId of children.added) {
          await act.addPersonRelation(chId, newPerson.id, 'PARENT');
        }
        for (const chId of children.removed) {
          await act.delPersonRelation(chId, newPerson.id, 'PARENT');
        }
      }

      return newPerson;
    });

    return redirect(302, `/details/${person.id}`);
  }
};
