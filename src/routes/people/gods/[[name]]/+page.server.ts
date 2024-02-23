import { MEDIA_IMAGE_MIME_TYPES } from '$env/static/private';
import { personStandardDate, personUpdatableLocalDateTime } from '$lib/server/graph/mgutils';
import { ReadActions, WriteActions } from '$lib/server/graph/person.js';
import { addOrReplacePhoto } from '$lib/server/media.js';
import { error, type Actions } from '@sveltejs/kit';
import { isUUID } from '$lib/utils.js';
import { PERSON_KEYS, PERSON_SCHEMA, type UpdatablePerson } from '$lib/types.js';
import { ValidationError } from 'yup';

export async function load({ params }) {
  const godName = params.name ?? 'Zeus';

  const [focusPeopleIds, [people, relations]] = await ReadActions.perform(async act => {
    const ppl = await act.findPeopleByFirstName(godName);
    if (ppl.length < 1) {
      error(404);
    }
    const focusPerson = ppl[0];
    const partner = await act.findMainPartner(focusPerson.id);
    const partnerIds = [focusPerson.id, partner?.id].filter(v => v !== undefined) as string[];
    return [partnerIds, await act.findFamily(partnerIds, 2)];
  });

  // get all child IDs and list of their parents
  const children: Record<string, string[]> = {};
  for (const rel of relations) {
    if (rel.relType == 'parent' && focusPeopleIds.includes(rel.participants.parent[0])) {
      (children[rel.participants.child[0]] ??= []).push(rel.participants.parent[0]);
    }
  }
  // filter children to only include ones that are children of all people in focusPeopleIds
  const sharedChildren = Object.entries(children).filter(([_, pIds]) => focusPeopleIds.every(id => pIds.includes(id))).map(([cId, _]) => cId);

  // get all parents of each focus person
  const parents: Record<string, string[]> = {};
  for (const rel of relations) {
    if (rel.relType == 'parent' && focusPeopleIds.includes(rel.participants.child[0])) {
      (parents[rel.participants.child[0]] ??= []).push(rel.participants.parent[0]);
    }
  }
 
  return {godName, focusPeopleIds, people: people.map(personStandardDate), relations, children: sharedChildren, parentsOf: parents};
}

function getUUID(formData: FormData): string {
  const uuid = formData.get('person-id') as string;
  if (!isUUID(uuid)) {
    console.log('missing person-id in form data');
    error(422, 'missing person UUID');
  }
  return uuid;
}

function validatePerson(person: {[k: string]: any}): UpdatablePerson {
  return PERSON_SCHEMA.validateSync(person, { abortEarly: true, stripUnknown: true });
}

export const actions: Actions = {
  updatePerson: async ({ request }) => {
    const data = await request.formData();
    console.log('updating person ', data.get('id'));
    const dangerousPerson = Object.fromEntries(PERSON_KEYS.map(k => {
      const v = data.get(k)?.valueOf();
      return [k, v]
    }).filter(e => e[1] !== undefined));
    let validPerson: UpdatablePerson;
    try {
      validPerson = validatePerson(dangerousPerson);
    } catch (err) {
      if (err instanceof ValidationError) {
        return error(422, err.message);
      }
      throw err;
    }
    const updatedPerson = await WriteActions.perform(async act => {
      return act.updatePerson(personUpdatableLocalDateTime(validPerson));
    });
  },
  deletePerson: async ({ request }) => {
    const data = await request.formData();
    const personUuid = getUUID(data);
    console.log('deleting person ', personUuid);
  },
  uploadPic: async ({ request }) => {
    const data = await request.formData();
    const personUuid = getUUID(data);
    console.log('uploading avatar ', personUuid);
    const file = data.get('pic')?.valueOf();
    if (!(file instanceof File)) {
      console.error("file in request.formData() isn't an instance of File, likely because browser sent data using incorrect enctype");
      error(422, 'file was not uploaded');
    }
    if (!MEDIA_IMAGE_MIME_TYPES.includes(file.type)) {
      error(422, 'file type is not allowed');
    }
    await addOrReplacePhoto(personUuid, file);
  },
  deletePic: async ({ request }) => {
    const data = await request.formData();
    const personUuid = getUUID(data);
    console.log('deleting avatar ', personUuid);
  }
}
