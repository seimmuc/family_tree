import { ReadActions, WriteActions } from '$lib/server/graph/person.js';
import { addOrReplacePhoto, tryDeletePhoto } from '$lib/server/media.js';
import {
  parseUpdatePerson,
  parseUpdatePhotos,
  parseUpdateRelatives,
  userHasPermission,
  userLoginRedirOrErrorIfNotAuthorized
} from '$lib/server/sutils.js';
import type { Person, Photo, PhotoData, Relationship } from '$lib/types/person.js';
import type { PhotoChanges, RelativesChangeRequest } from '$lib/types/reqdata.js';
import { sha256DigestFile } from '$lib/utils.js';
import { error, type Actions, fail, redirect } from '@sveltejs/kit';
import { Result, err, ok } from 'neverthrow';

export async function load({ params, locals, url }) {
  userLoginRedirOrErrorIfNotAuthorized(locals.user, 'view', url);
  const canEdit = userHasPermission(locals.user, 'edit');
  const pid = params.id;
  const dbRes: Result<[Person[], Relationship[], Photo[], Person], undefined> = await ReadActions.perform(async act => {
    const [ppl, rels] = await act.findFamily([pid], 1);
    const person = ppl.find(p => p.id === pid);
    if (person === undefined) {
      return err(undefined);
    }
    const pics =  await act.getPersonPhotos(pid);
    return ok([ppl, rels, pics, person]);
  });

  // return 404 if id does not match a real person
  if (dbRes.isErr()) {
    error(404);
  }

  const [allPeople, relations, photos, person] = dbRes.value;

  // Find children and parents
  const children: string[] = [];
  const parents: string[] = [];
  const partners: string[] = [];
  for (const rel of relations) {
    if (rel.relType === 'parent') {
      if (rel.participants.parent[0] === pid) {
        children.push(rel.participants.child[0]);
      } else if (rel.participants.child[0] === pid) {
        parents.push(rel.participants.parent[0]);
      }
    } else if (rel.relType === 'partner') {
      if (rel.participants.partner.includes(pid)) {
        for (const partnerId of rel.participants.partner) {
          if (partnerId !== pid) {
            partners.push(partnerId);
          }
        }
      }
    }
  }

  // Only send relatives who are useful to the page
  // TODO strip person objects of useless data
  const rids = children.concat(parents, partners);
  const relatives = allPeople.filter(p => rids.includes(p.id));

  return { person, children, parents, partners, relatives, photos, canEdit };
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
    if (personUpdate.portrait) {
      return fail(422, { message: 'setting portrait field is prohibited' });
    }
    const { id: pid } = personUpdate;
    const portrait = data.get('portrait');
    let relativesUpdate: RelativesChangeRequest<'parents' | 'children' | 'partners'> | undefined = undefined;
    if (data.has('relatives-update')) {
      const relRes = parseUpdateRelatives(data.get('relatives-update'), pid);
      if (relRes.isErr()) {
        return fail(relRes.error.code, { message: relRes.error.message });
      }
      relativesUpdate = relRes.value;
    }
    let photosUpdate: PhotoChanges | undefined = undefined;
    let photoFiles: Record<string, [File, Promise<string>]> = {};
    const beforeDb: Promise<any>[] = [];
    if (data.has('photo-changes')) {
      const phoRes = parseUpdatePhotos(data.get('photo-changes'));
      if (phoRes.isErr()) {
        return fail(phoRes.error.code, { message: phoRes.error.message });
      }
      photosUpdate = phoRes.value;
      for (const pn of photosUpdate.new) {
        if (Object.hasOwn(photoFiles, pn)) {
          return fail(422, { message: 'duplicate new file' });
        }
        const pFile = data.get(pn);
        if (!(pFile instanceof File)) {
          return fail(422, { message: 'file not present in form data' });
        }
        const hashPromise = sha256DigestFile(pFile)
        beforeDb.push(hashPromise)
        photoFiles[pn] = [pFile, hashPromise];
      };
    }

    // return error if there are no changes
    const updFields = Object.keys(personUpdate).filter(k => k !== 'id').length > 0;
    if (!updFields && !(portrait instanceof File && portrait.size > 0) && relativesUpdate === undefined && photosUpdate === undefined) {
      return fail(422, { message: 'empty update' });
    }

    if (beforeDb.length > 0) {
      // finish costly calculations before starting db transaction
      await Promise.allSettled(beforeDb);
    }

    // perform the updates
    await WriteActions.perform(async act => {
      const oldPerson = await act.findPersonById(pid);
      if (oldPerson === undefined) {
        return fail(422, { message: 'person does not exist' });
      }
      // save/delete portrait
      if (portrait instanceof File && portrait.size > 0) {
        // add new portrait file and delete the old one
        try {
          const [portraitFileName, _] = await addOrReplacePhoto(pid, portrait, oldPerson?.portrait);
          personUpdate.portrait = portraitFileName;
        } catch (e) {
          return fail(500, { message: 'cannot save portrait' });
        }
      } else if (personUpdate.portrait === null) {
        // delete old portrait
        if (oldPerson.portrait) {
          await tryDeletePhoto(oldPerson.portrait);
        }
      }

      // person's fields
      if (updFields || personUpdate.portrait !== undefined) {
        act.updatePerson(personUpdate);
      }

      // relations
      if (relativesUpdate !== undefined) {
        const { parents, children, partners } = relativesUpdate;
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
        if (partners !== undefined) {
          for (const partnerId of partners.added) {
            await act.addPartnerRelation(pid, partnerId);
          }
          for (const partnerId of partners.removed) {
            await act.delPartnerRelation(pid, partnerId);
          }
        }
      }

      // photos
      if (photosUpdate !== undefined) {
        const oldPhotos = await act.getPersonPhotos(pid);
        const toRemove = photosUpdate.delete.map(pi => oldPhotos.find(p => p.id === pi)).filter(p => p !== undefined) as Photo[];
        const toAdd: PhotoData[] = [];
        for (const [_, [pFile, pHashPr]] of Object.entries(photoFiles)) {
          const [pFileName, _] = await addOrReplacePhoto(pid, pFile);
          toAdd.push({ hash: await pHashPr, filename: pFileName });
        }
        for (const photo of toRemove) {
          if (!(await tryDeletePhoto(photo.filename))) {
            console.error(`Failed to delete a photo. Photo: "${photo.filename}", pid: ${pid}`);
          }
        }
        if (toAdd.length > 0) {
          await act.addPhotos(pid, toAdd);
        }
        if (toRemove.length > 0) {
          await act.deletePhotos(pid, toRemove.map(p => p.id));
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

    // delete the person's portrait if they had one
    if (delPerson.portrait) {
      if (!(await tryDeletePhoto(delPerson.portrait))) {
        console.error(`Failed to delete portrait while deleting person. Portrait: "${delPerson.portrait}", pid: ${pid}`);
      }
    }

    // redirect user to the home page
    return redirect(302, `/`);
  }
};
