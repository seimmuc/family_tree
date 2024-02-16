<script lang="ts">
	import PersonNode from '$lib/components/PersonNode.svelte';
  import { Parentship, type Person, toRelationshipClass, type RelationshipCl } from '$lib/types.js';

  export let data;

  const pplMap = Object.fromEntries(data.people.map(p => [p.id as string, p]));
  const relationships: RelationshipCl[] = data.relations.map(rel => toRelationshipClass(rel, pplMap));
  const parentships: Parentship[] = relationships.filter(r => r.relType === 'parent') as Parentship[];

  const focusPeople = data.people.filter((element) => data.focusPeopleIds.includes(element.id));
  const parents = parentships.filter((element) => data.focusPeopleIds.includes(element.child.id)).map((element) => element.parent as Person<Date>);
  const children = parentships.filter((element) => data.focusPeopleIds.includes(element.parent.id)).map((element) => element.child as Person<Date>);
</script>

<h2>Temp pages for testing purposes only, will be removed later</h2>

{#each focusPeople as person}
  <PersonNode person={person} />
{/each}

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