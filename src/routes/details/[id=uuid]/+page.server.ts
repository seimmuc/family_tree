import { ReadActions, WriteActions } from '$lib/server/graph/person.js';
import { addOrReplacePhoto, tryDeletePhoto } from '$lib/server/media.js';
import { parseUpdatePerson } from '$lib/server/sutils.js';
import { error, type Actions, fail } from '@sveltejs/kit';

export async function load({ params }) {
  const person = await ReadActions.perform(async act => {
    return await act.findPersonById(params.id);
  });

  if (person === undefined) {
    error(404);
  }

  return {
    person
  };
}

export const actions: Actions = {
  update: async ({ request }) => {
    const data = await request.formData();
    const pupRes = parseUpdatePerson(data.get('person-update'));
    if (pupRes.isErr()) {
      return fail(pupRes.error.code, { message: pupRes.error.message });
    }
    const personUpdate = pupRes.value;
    const photo = data.get('photo');

    const updatedPerson = await WriteActions.perform(async act => {
      if (photo instanceof File && photo.size > 0) {
        // add new photo file and delete the old one
        const oldPerson = await act.findPersonById(personUpdate.id);
        try {
          const [photoFileName, _] = await addOrReplacePhoto(personUpdate.id, photo, oldPerson?.photo);
          personUpdate.photo = photoFileName;
        } catch (e) {
          return fail(500, { message: 'cannot save photo' });
        }
      } else if (personUpdate.photo === null) {
        // delete old photo
        const oldPerson = await act.findPersonById(personUpdate.id);
        if (oldPerson !== undefined && oldPerson.photo) {
          await tryDeletePhoto(oldPerson.photo);
        }
      }
      return act.updatePerson(personUpdate);
    });
  }
};
