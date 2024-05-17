import { parseNewPerson, userHasPermission, userLoginRedirOrErrorIfNotAuthorized } from '$lib/server/sutils';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types.js';
import { WriteActions } from '$lib/server/graph/person.js';

export async function load({ locals, url }) {
  userLoginRedirOrErrorIfNotAuthorized(locals.user, 'edit', url);
  return {};
}

export const actions: Actions = {
  default: async ({ request, cookies, locals }) => {
    if (!userHasPermission(locals.user, 'edit')) {
      return fail(403, { message: 'unauthorized' });
    }

    const data = await request.formData();
    const npRes = parseNewPerson(data.get('person-new'));
    if (npRes.isErr()) {
      return fail(npRes.error.code, { message: npRes.error.message });
    }
    const newPersonData = npRes.value;
    console.log(newPersonData);

    const person = await WriteActions.perform(act => {
      return act.addPerson(newPersonData);
    });

    return redirect(302, `/details/${person.id}`);
  }
};
