import { WriteActions, filtersWhereAnd } from "$lib/server/graph/person";

const ALL_FIRST_NAMES = ['Hades', 'Cronus', 'Rhea', 'Hera', 'Poseidon', 'Zeus', 'Persephone', 'Ares', 'Aphrodite', 'Eros', 'Phobos', 'Maia', 'Hermes', 'Rhodos', 'Hermaphroditus', 'Helios', 'Ochimus']

export async function load() {
  // Warning: evil datapase writes on GET request live here
  const [peopleDeleted, peopleAdded] = await WriteActions.perform(async act => {
    const delCount = await act.deletePeople(filtersWhereAnd([{prop: 'name', operator: 'IN', val: ALL_FIRST_NAMES}], 'p'));
    const pplCountStart = await act.countAllPeople();
    
    const hades = await act.addPerson({name: 'Hades', gender: 'male', bio: 'God of the dead and the king of the underworld'});
    
    const cronus = await act.addPerson({name: 'Cronus', gender: 'male', bio: 'Self-fulfiller of a prophecy'});
    await act.addPersonRelation(hades.id, cronus.id, 'PARENT');
    
    const rhea = await act.addPerson({name: 'Rhea', gender: 'female', bio: 'Full-time mom and a part-time trickster'});
    await act.addPersonRelation(hades.id, rhea.id, 'PARENT');
    await act.addPersonRelation(rhea.id, cronus.id, 'PARTNER');
    
    const hera = await act.addPerson({name: 'Hera', gender: 'female', bio: 'Goddess of marriage'});
    await act.addPersonRelation(hera.id, rhea.id, 'PARENT');
    await act.addPersonRelation(hera.id, cronus.id, 'PARENT');
    
    const poseidon = await act.addPerson({name: 'Poseidon', gender: 'male', bio: 'Ruler of seas, winds, and even the earth(quakes). Also horses. Mostly just horses.'});
    await act.addPersonRelation(poseidon.id, rhea.id, 'PARENT');
    await act.addPersonRelation(poseidon.id, cronus.id, 'PARENT');
    
    const zeus = await act.addPerson({name: 'Zeus', gender: 'male', bio: 'God of thunder, aka the sky daddy. Sex god, but only figuratively.'});
    await act.addPersonRelation(zeus.id, rhea.id, 'PARENT');
    await act.addPersonRelation(zeus.id, cronus.id, 'PARENT');
    
    const persephone = await act.addPerson({name: 'Persephone', gender: 'female', bio: 'I didn\'t choose the underworld, the king of the underworld chose me. Through kidnapping.'});
    await act.addPersonRelation(persephone.id, zeus.id, 'PARENT');
    
    const ares = await act.addPerson({name: 'Ares', gender: 'male'});
    await act.addPersonRelation(ares.id, hera.id, 'PARENT');
    await act.addPersonRelation(ares.id, zeus.id, 'PARENT');
    
    const aphrodite = await act.addPerson({name: 'Aphrodite', gender: 'female', bio: 'Goddess of beauty, love and lust'});
    await act.addPersonRelation(aphrodite.id, zeus.id, 'PARENT');
    await act.addPersonRelation(aphrodite.id, ares.id, 'PARTNER');
    
    const eros = await act.addPerson({name: 'Eros', gender: 'male', bio: 'God of love and sex'});
    await act.addPersonRelation(eros.id, ares.id, 'PARENT');
    await act.addPersonRelation(eros.id, aphrodite.id, 'PARENT');
    
    const phobos = await act.addPerson({name: 'Phobos', gender: 'male'});
    await act.addPersonRelation(phobos.id, ares.id, 'PARENT');
    await act.addPersonRelation(phobos.id, aphrodite.id, 'PARENT');
    
    const maia = await act.addPerson({name: 'Maia', gender: 'female'});
    
    const hermes = await act.addPerson({name: 'Hermes', gender: 'male'});
    await act.addPersonRelation(hermes.id, maia.id, 'PARENT');
    await act.addPersonRelation(hermes.id, zeus.id, 'PARENT');
    
    const rhodos = await act.addPerson({name: 'Rhodos', gender: 'female'});
    await act.addPersonRelation(rhodos.id, poseidon.id, 'PARENT');
    await act.addPersonRelation(rhodos.id, aphrodite.id, 'PARENT');
    
    const hermaphroditus = await act.addPerson({name: 'Hermaphroditus', gender: 'nb'});
    await act.addPersonRelation(hermaphroditus.id, hermes.id, 'PARENT');
    await act.addPersonRelation(hermaphroditus.id, aphrodite.id, 'PARENT');
    
    const helios = await act.addPerson({name: 'Helios', gender: 'male'});
    
    const ochimus = await act.addPerson({name: 'Ochimus', gender: 'male'});
    await act.addPersonRelation(ochimus.id, rhodos.id, 'PARENT');
    await act.addPersonRelation(ochimus.id, helios.id, 'PARENT');

    const pplCountEnd = await act.countAllPeople();
    return [delCount, pplCountEnd - pplCountStart];
  });

  return { peopleDeleted, peopleAdded };
}
