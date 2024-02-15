<script lang="ts">
	import { Parentship, type ParentRelationship, type Person } from '$lib/types.js';

  export let data;
  const pplMap = Object.fromEntries(data.people.map(p => [p.id as string, p as Person & {id: string}]));
  const parentships: Parentship[] = data.relations.map(rel => {
    return Parentship.fromRelation(rel as ParentRelationship, pplMap);
  })
</script>

<h2>Temp pages for testing purposes only, will be removed later</h2>

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