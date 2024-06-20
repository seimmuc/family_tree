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
    if (newPersonData.portrait !== undefined) {
      return fail(422, { message: 'cannot set phohibited fields' });
    }

    const relRes = parseUpdateRelatives(data.get('relatives-new'));
    if (relRes.isErr()) {
      return fail(relRes.error.code, { message: relRes.error.message });
    }
    const relUpd: RelativesChangeRequest<'parents' | 'children' | 'partners'> = relRes.value;

    const person = await WriteActions.perform(async act => {
      // create person
      const newPerson = await act.addPerson(newPersonData);

      // add relations
      const { parents, children, partners } = relUpd;
      if (parents !== undefined) {
        for (const prId of parents.added) {
          await act.addParentRelation(newPerson.id, prId);
        }
        for (const prId of parents.removed) {
          await act.delParentRelation(newPerson.id, prId);
        }
      }
      if (children !== undefined) {
        for (const chId of children.added) {
          await act.addParentRelation(chId, newPerson.id);
        }
        for (const chId of children.removed) {
          await act.delParentRelation(chId, newPerson.id);
        }
      }
      if (partners !== undefined) {
        for (const partnerId of partners.added) {
          await act.addPartnerRelation(newPerson.id, partnerId);
        }
        for (const partnerId of partners.removed) {
          await act.delPartnerRelation(newPerson.id, partnerId);
        }
      }

      return newPerson;
    });

    return redirect(302, `/details/${person.id}`);
  }
};
