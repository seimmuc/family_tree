import { ReadActions, WriteActions } from '$lib/server/graph/person.js';
import { addOrReplacePhoto, tryDeletePhoto } from '$lib/server/media.js';
import {
  parseUpdatePerson,
  parseUpdateRelatives,
  userHasPermission,
  userLoginRedirOrErrorIfNotAuthorized
} from '$lib/server/sutils.js';
import type { RelativesChangeRequest } from '$lib/types/reqdata.js';
import { error, type Actions, fail, redirect } from '@sveltejs/kit';

export async function load({ params, locals, url }) {
  userLoginRedirOrErrorIfNotAuthorized(locals.user, 'view', url);
  const canEdit = userHasPermission(locals.user, 'edit');
  const pid = params.id;
  const [allPeople, relations] = await ReadActions.perform(async act => {
    return await act.findFamily([pid], 1);
  });

  const person = allPeople.find(p => p.id === pid);
  if (person === undefined) {
    error(404);
  }

  // Find children and parents
  const children: string[] = [];
  const parents: string[] = [];
  for (const rel of relations) {
    if (rel.relType === 'parent') {
      if (rel.participants.parent[0] === pid) {
        children.push(rel.participants.child[0]);
      } else if (rel.participants.child[0] === pid) {
        parents.push(rel.participants.parent[0]);
      }
    }
  }

  // Only send relatives who are useful to the page
  // TODO strip person objects of useless data
  const rids = children.concat(parents);
  const relatives = allPeople.filter(p => rids.includes(p.id));

  return { person, children, parents, relatives, canEdit };
}

export const actions: Actions = {
  update: async ({ request, locals }) => {
    if (!userHasPermission(locals.user, 'edit')) {
      return fail(403, { message: 'unauthorized' });
    }

    const data = await request.formData();

    // parse update data
    const pupRes = parseUpdatePerson(data.get('person-update'));
    if (pupRes.isErr()) {
      return fail(pupRes.error.code, { message: pupRes.error.message });
    }
    const personUpdate = pupRes.value;
    if (personUpdate.photo) {
      return fail(422, { message: 'setting photo field is prohibited' });
    }
    const { id: pid } = personUpdate;
    const photo = data.get('photo');
    let relativesUpdate: RelativesChangeRequest<'parents' | 'children'> | undefined = undefined;
    if (data.has('relatives-update')) {
      const relRes = parseUpdateRelatives(data.get('relatives-update'), pid);
      if (relRes.isErr()) {
        return fail(relRes.error.code, { message: relRes.error.message });
      }
      relativesUpdate = relRes.value;
    }

    // return error if there are no changes
    const updFields = Object.keys(personUpdate).filter(k => k !== 'id').length > 0;
    if (!updFields && !(photo instanceof File && photo.size > 0) && relativesUpdate === undefined) {
      return fail(422, { message: 'empty update' });
    }

    // perform the updates
    await WriteActions.perform(async act => {
      const oldPerson = await act.findPersonById(pid);
      if (oldPerson === undefined) {
        return fail(422, { message: 'person does not exist' });
      }
      // save/delete photo
      if (photo instanceof File && photo.size > 0) {
        // add new photo file and delete the old one
        try {
          const [photoFileName, _] = await addOrReplacePhoto(pid, photo, oldPerson?.photo);
          personUpdate.photo = photoFileName;
        } catch (e) {
          return fail(500, { message: 'cannot save photo' });
        }
      } else if (personUpdate.photo === null) {
        // delete old photo
        const oldPerson = await act.findPersonById(pid);
        if (oldPerson !== undefined && oldPerson.photo) {
          await tryDeletePhoto(oldPerson.photo);
        }
      }

      // person's fields
      if (updFields || personUpdate.photo !== undefined) {
        act.updatePerson(personUpdate);
      }

      // relations
      if (relativesUpdate !== undefined) {
        const { parents, children } = relativesUpdate;
        if (parents !== undefined) {
          for (const prId of parents.added) {
            await act.addParentRelation(pid, prId);
          }
          for (const prId of parents.removed) {
            await act.delParentRelation(pid, prId);
          }
        }
        if (children !== undefined) {
          for (const chId of children.added) {
            await act.addParentRelation(chId, pid);
          }
          for (const chId of children.removed) {
            await act.delParentRelation(chId, pid);
          }
        }
      }
    });
  },
  delete: async ({ locals, params }) => {
    if (!userHasPermission(locals.user, 'edit')) {
      return fail(403, { message: 'unauthorized' });
    }

    const pid = params.id;
    if (pid === undefined) {
      // this should never happen since uuid isn't optional for this route
      return fail(500, { message: 'something went wrong' });
    }

    // delete person from db
    const delPerson = await WriteActions.perform(act => act.deletePerson(pid));

    // check if person existed, if not user is probably on a stale page
    if (delPerson === undefined) {
      return fail(500, { message: 'this person does not exist' });
    }

    // delete the person's photo if they had one
    if (delPerson.photo) {
      if (!(await tryDeletePhoto(delPerson.photo))) {
        console.error(`Failed to delete photo while deleting person. Photo: "${delPerson.photo}", pid: ${pid}`);
      }
    }

    // redirect user to the home page
    return redirect(302, `/`);
  }
};
