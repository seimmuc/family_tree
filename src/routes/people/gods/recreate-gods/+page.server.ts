import { WriteActions, filtersWhereAnd } from "$lib/server/graph/person";

const ALL_FIRST_NAMES = ['Hades', 'Cronus', 'Rhea', 'Hera', 'Poseidon', 'Zeus', 'Persephone', 'Ares', 'Aphrodite', 'Eros', 'Phobos', 'Maia', 'Hermes', 'Rhodos', 'Hermaphroditus', 'Helios', 'Ochimus']

export async function load() {
  // Warning: evil datapase writes on GET request live here
  const [peopleDeleted, peopleAdded] = await WriteActions.perform(async act => {
    const delCount = await act.deletePeople(filtersWhereAnd([{prop: 'firstName', operator: 'IN', val: ALL_FIRST_NAMES}], 'p'));
    const pplCountStart = await act.countAllPeople();
    
    const hades = await act.addPerson({firstName: 'Hades', gender: 'male'});
    
    const cronus = await act.addPerson({firstName: 'Cronus', gender: 'male'});
    await act.addPersonRelation(hades.id, cronus.id, 'PARENT');
    
    const rhea = await act.addPerson({firstName: 'Rhea', gender: 'female'});
    await act.addPersonRelation(hades.id, rhea.id, 'PARENT');
    await act.addPersonRelation(rhea.id, cronus.id, 'PARTNER');
    
    const hera = await act.addPerson({firstName: 'Hera', gender: 'female'});
    await act.addPersonRelation(hera.id, rhea.id, 'PARENT');
    await act.addPersonRelation(hera.id, cronus.id, 'PARENT');
    
    const poseidon = await act.addPerson({firstName: 'Poseidon', gender: 'male'});
    await act.addPersonRelation(poseidon.id, rhea.id, 'PARENT');
    await act.addPersonRelation(poseidon.id, cronus.id, 'PARENT');
    
    const zeus = await act.addPerson({firstName: 'Zeus', gender: 'male'});
    await act.addPersonRelation(zeus.id, rhea.id, 'PARENT');
    await act.addPersonRelation(zeus.id, cronus.id, 'PARENT');
    
    const persephone = await act.addPerson({firstName: 'Persephone', gender: 'female'});
    await act.addPersonRelation(persephone.id, zeus.id, 'PARENT');
    
    const ares = await act.addPerson({firstName: 'Ares', gender: 'male'});
    await act.addPersonRelation(ares.id, hera.id, 'PARENT');
    await act.addPersonRelation(ares.id, zeus.id, 'PARENT');
    
    const aphrodite = await act.addPerson({firstName: 'Aphrodite', gender: 'female'});
    await act.addPersonRelation(aphrodite.id, zeus.id, 'PARENT');
    await act.addPersonRelation(aphrodite.id, ares.id, 'PARTNER');
    
    const eros = await act.addPerson({firstName: 'Eros', gender: 'male'});
    await act.addPersonRelation(eros.id, ares.id, 'PARENT');
    await act.addPersonRelation(eros.id, aphrodite.id, 'PARENT');
    
    const phobos = await act.addPerson({firstName: 'Phobos', gender: 'male'});
    await act.addPersonRelation(phobos.id, ares.id, 'PARENT');
    await act.addPersonRelation(phobos.id, aphrodite.id, 'PARENT');
    
    const maia = await act.addPerson({firstName: 'Maia', gender: 'female'});
    
    const hermes = await act.addPerson({firstName: 'Hermes', gender: 'male'});
    await act.addPersonRelation(hermes.id, maia.id, 'PARENT');
    await act.addPersonRelation(hermes.id, zeus.id, 'PARENT');
    
    const rhodos = await act.addPerson({firstName: 'Rhodos', gender: 'female'});
    await act.addPersonRelation(rhodos.id, poseidon.id, 'PARENT');
    await act.addPersonRelation(rhodos.id, aphrodite.id, 'PARENT');
    
    const hermaphroditus = await act.addPerson({firstName: 'Hermaphroditus', gender: 'nb'});
    await act.addPersonRelation(hermaphroditus.id, hermes.id, 'PARENT');
    await act.addPersonRelation(hermaphroditus.id, aphrodite.id, 'PARENT');
    
    const helios = await act.addPerson({firstName: 'Helios', gender: 'male'});
    
    const ochimus = await act.addPerson({firstName: 'Ochimus', gender: 'male'});
    await act.addPersonRelation(ochimus.id, rhodos.id, 'PARENT');
    await act.addPersonRelation(ochimus.id, helios.id, 'PARENT');

    const pplCountEnd = await act.countAllPeople();
    return [delCount, pplCountEnd - pplCountStart];
  });

  return { peopleDeleted, peopleAdded };
}
