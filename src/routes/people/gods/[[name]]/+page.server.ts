import { personStandardDate } from '$lib/server/graph/mgutils';
import { ReadActions } from '$lib/server/graph/person.js';
import { error } from '@sveltejs/kit';

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

export const actions = {
  updatePerson: async ({ request }) => {
    const data = await request.formData();
    const personUuid = data.get('person-id');
    console.log('updating person ', personUuid);
  },
  deletePerson: async ({ request }) => {
    const data = await request.formData();
    const personUuid = data.get('person-id');
    console.log('deleting person ', personUuid);
  },
  uploadPic: async ({ request }) => {
    const data = await request.formData();
    const personUuid = data.get('person-id');
    console.log('uploading avatar ', personUuid);
  },
  deletePic: async ({ request }) => {
    const data = await request.formData();
    const personUuid = data.get('person-id');
    console.log('deleting avatar ', personUuid);
  }
}
