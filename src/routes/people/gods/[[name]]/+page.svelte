<script lang="ts">
	import PersonNode from '$lib/components/PersonNode.svelte';
import { Parentship, type ParentRelationship, type Person } from '$lib/types.js';

  export let data;

  const pplMap = Object.fromEntries(data.people.map(p => [p.id as string, p as Person & {id: string}]));
  const parentships: Parentship[] = data.relations.map(rel => {
    return Parentship.fromRelation(rel as ParentRelationship, pplMap);
  });

  const person = data.people.find((element) => element.id === data.personId) as Person;
  const parents = parentships.filter((element) => element.child.id === data.personId).map((element) => element.parent as Person<Date>);
  const children = parentships.filter((element) => element.parent.id === data.personId).map((element) => element.child as Person<Date>);
</script>

<h2>Temp pages for testing purposes only, will be removed later</h2>

<PersonNode person={person} />

{#each parents as parent}
  <PersonNode person={parent} />
{/each}

{#each children as child}
  <PersonNode person={child} />
{/each}

<p>{data.godName}: ({data.people.length}, {data.relations.length})</p>

<h1>People:</h1>
<ol>
  {#each data.people as person}
    <li><span style="font-family: monospace;">[{person.id}]</span>: {person.firstName}</li>
  {/each}
</ol>

<h1>Relations:</h1>
<ol>
  {#each parentships as parentship}
    <li>{parentship.relType}, parent: <span style="font-family: monospace;">{parentship.parent.id}</span>, child: <span style="font-family: monospace;">{parentship.child.id}</span></li>
  {/each}
</ol>