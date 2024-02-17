<script lang="ts">
	import PersonNode from '$lib/components/PersonNode.svelte';
	import type { Point } from '$lib/components/types.js';
  import { Parentship, type Person, toRelationshipClass, type RelationshipCl } from '$lib/types.js';
	import { onMount, tick } from 'svelte';

  export let data;

  let cnv: HTMLCanvasElement;

  const pplMap = Object.fromEntries(data.people.map(p => [p.id as string, p]));
  const relationships: RelationshipCl[] = data.relations.map(rel => toRelationshipClass(rel, pplMap));
  const parentships: Parentship[] = relationships.filter(r => r.relType === 'parent') as Parentship[];

  // Construct collections of people's data to be used throughout the page
  type PersonData = {person: Person<Date>, node: PersonNode};
  const focusPeople: Array<PersonData & {parents: PersonData[]}> = data.people.filter((element) => data.focusPeopleIds.includes(element.id)).map(person => {return {person: person, node: undefined as any as PersonNode, parents: [] as PersonData[]}});
  const parents: Array<{person: Person<Date>, node: PersonNode, child: string}> = Object.entries(data.parentsOf).flatMap(([fId, pIds]) => pIds.map(pId => {return {person: pplMap[pId] as Person<Date>, node: undefined as any as PersonNode, child: fId}}));
  const children: Array<PersonData> = data.children.map(cId => pplMap[cId]).filter(c => c !== undefined).map((element) => {return {person: element as Person<Date>, node: undefined as any as PersonNode}});
  parents.forEach(p => {
    focusPeople.find(fp => fp.person.id === p.child)?.parents.push(p);
  });

  let wrapperElem: HTMLDivElement;
  const wrapperDimensions = {x: 0, y: 0, width: 0, height: 0};

  onMount(async () => {
    // Wait for wrapperDimensions object to update
    await tick();
    wrapperDimensions.x = wrapperElem.getBoundingClientRect().x;
    wrapperDimensions.y = wrapperElem.getBoundingClientRect().y;
    
    // Init canvas context
    const context = cnv.getContext('2d') as CanvasRenderingContext2D;
    context.lineWidth = 10;
    context.strokeStyle = "rgb(0 0 0)";
    context.lineCap = "square";
    context.beginPath();

    // Middle of nodes in the "focus" group
    let middle: Point;

    if (focusPeople.length === 1) {
      middle = focusPeople[0].node.center(wrapperDimensions);
    } else if (focusPeople.length > 1) {
      const center1 = focusPeople[0].node.center(wrapperDimensions);
      const center2 = focusPeople[1].node.center(wrapperDimensions);
      middle = {x: (center1.x + center2.x) / 2, y: (center1.y + center2.y) / 2};
      
      // horizontal focus line
      context.moveTo(center1.x, center1.y);
      context.lineTo(center2.x, center2.y);
    } else {throw Error()}

    if (children.length > 0) {
      const childPoints = children.map((element) => element.node.center(wrapperDimensions));
      const childNodeY = children[0].node.center(wrapperDimensions).y;
      const c1p2: Point = {x: middle.x, y: (middle.y + childNodeY) / 2};
      const c2p1: Point = {x: childPoints[0].x, y: c1p2.y};
      const c2p2: Point = {x: childPoints[childPoints.length - 1].x, y: c1p2.y};

      // vertical line TO children
      context.moveTo(middle.x, middle.y);
      context.lineTo(c1p2.x, c1p2.y);
      
      // horizontal line BETWEEN children
      context.moveTo(c2p1.x, c2p1.y);
      context.lineTo(c2p2.x, c2p2.y);
    
      // lines TO each child
      for (const point of childPoints) {
        context.moveTo(point.x, c1p2.y);
        context.lineTo(point.x, point.y);
      }
    }
    context.stroke();
  });
</script>

<h2>Temp pages for testing purposes only, will be removed later</h2>

<!-- Main Area -->
<div class="tree-wrapper" bind:clientWidth={wrapperDimensions.width} bind:clientHeight={wrapperDimensions.height} bind:this={wrapperElem}>
  <canvas bind:this={cnv} class="lines-canvas" width="{wrapperDimensions.width}" height="{wrapperDimensions.height}"></canvas>
  <div class="row parents">
    {#each parents as parent}
      <!-- Parent Nodes -->
      <PersonNode bind:this={parent.node} person={parent.person} />
    {/each}
  </div>
  <div class="row focus">
    {#each focusPeople as person}
      <!-- Focus Nodes -->
      <PersonNode bind:this={person.node} person={person.person} />
    {/each}
  </div>
  <div class="row children">
    {#each children as child}
      <!-- Children Nodes -->
      <PersonNode bind:this={child.node} person={child.person} />
    {/each}
  </div>
</div>

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

<style>
  .tree-wrapper {
    display: flex;
    flex-direction: column;
    position: relative;
  }

  .row {
    display: flex;
    flex-direction: row;
    align-items: center;
    margin-top: 15px;
    justify-content: center;
    gap: 60px;
  }

  .row.children {
    margin-top: 200px;
    gap: 20px;
  }

  .lines-canvas {
    width: 100%;
    height: 100%;
    position: absolute;
    z-index: -1;
  }
</style>