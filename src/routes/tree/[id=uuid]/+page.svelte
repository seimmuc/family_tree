<script lang="ts">
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import { TRANS_DELAY, gotoUrl, redirUserChange } from '$lib/client/clutils.js';
  import { theme } from '$lib/client/stores.js';
  import FloatingUiComponent, { type FloatingUICompControl } from '$lib/components/FloatingUIComponent.svelte';
  import PersonNode from '$lib/components/PersonNode.svelte';
  import PopUp from '$lib/components/PopUp.svelte';
  import { type SearchBoxLinkFunc } from '$lib/components/SearchBox.svelte';
  import Navbar from '$lib/components/Navbar.svelte';
  import { drawLine, findMidPoint, type Point } from '$lib/drawutils.js';
  import { type Person } from '$lib/types/person.js';
  import { type ClientRectObject } from '@floating-ui/core';
  import * as m from '$lib/paraglide/messages.js';
  import { onMount } from 'svelte';
  import { tweened } from 'svelte/motion';
  import { createUrl, minAndMax } from '$lib/utils.js';

  const TIME_TO_CENTER = 1000 * 1;

  export let data;

  let cnv: HTMLCanvasElement;
  let childRows = { shared: undefined as HTMLDivElement | undefined, other: undefined as HTMLDivElement | undefined };
  let resize: ResizeObserver;
  let resizeTimer: NodeJS.Timeout | number;
  let themeDarkVal = data.theme === 'dark' ? 1 : 0;
  const themeTween = tweened(themeDarkVal, { duration: TRANS_DELAY });
  let themeDarkLastRedraw: number = 0;

  type PersonData = { person: Person; node: PersonNode };
  let focusPeople: Array<PersonData & { parents: PersonData[] }>;
  let parents: Array<PersonData & { child: string }>;
  let children: { s: PersonData[], l: PersonData[], r: PersonData[] };

  function pdArr(idArr: Person['id'][] | undefined, pplMap: Record<string, Person>): PersonData[] {
    if (idArr === undefined) {
      return [];
    }
    return idArr
      .map(i => pplMap[i])
      .filter(p => p !== undefined)
      .map(person => ({ person, node: undefined as any as PersonNode } satisfies PersonData));
  }

  function peopleUpdate() {
    // Construct collections of people's data to be used throughout the page
    const pplMap: Record<string, Person> = Object.fromEntries(data.people.map(p => [p.id as string, p]));
    focusPeople = data.people
      .filter(element => data.focusPeopleIds.includes(element.id))
      .map(person => {
        return { person: person, node: undefined as any as PersonNode, parents: [] as PersonData[] };
      });
    parents = Object.entries(data.parentsOf).flatMap(([fId, pIds]) =>
      pIds.map(pId => {
        return { person: pplMap[pId] as Person, node: undefined as any as PersonNode, child: fId };
      })
    );
    children = {
      s: pdArr(data.children.shared, pplMap),
      l: pdArr(focusPeople.length < 2 ? undefined : data.children.other[focusPeople[0].person.id], pplMap),
      r: pdArr(focusPeople.length < 2 ? undefined : data.children.other[focusPeople[1].person.id], pplMap)
    };
    parents.forEach(p => {
      focusPeople.find(fp => fp.person.id === p.child)?.parents.push(p);
    });
    if (popup.control?.isVisible()) {
      // popup.person.node will be unbound and undefined after upcoming DOM update, we need to relink popup with new PersonData object
      const personId = popup.person.person.id;
      pdloop: for (let pdArr of [focusPeople, parents, children.s, children.l, children.r]) {
        for (let pd of pdArr) {
          if (pd.person.id === personId) {
            popup.person = pd;
            break pdloop;
          }
        }
      }
    }
    if (cnv !== undefined) {
      // on navigation or person update
      resizeTimer = setTimeout(redraw, 0);
    }
  }
  $: data.people, peopleUpdate();

  const popup = {
    control: undefined as FloatingUICompControl | undefined,
    comp: undefined as PopUp | undefined,
    person: undefined as any as PersonData,
    timeOpened: undefined as number | undefined,
    virtElem: {
      getBoundingClientRect: (): ClientRectObject => {
        if (popup.person && popup.person.node) {
          return popup.person.node.boundBox();
        }
        return { x: 0, y: 0, top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0 };
      }
    }
  };
  let dontClosePopup = false;

  function onPersonClick(person: PersonData) {
    if (popup.control?.isVisible()) {
      if (popup.person !== undefined && popup.person.person.id === person.person.id) {
        // user clicked on same person again
        if (!focusPeople.some(p => p.person.id === person.person.id) && popup.timeOpened !== undefined && popup.timeOpened + TIME_TO_CENTER < Date.now()) {
          // it's not one of focus people and the delay has passed, let's center on this person
          gotoUrl(createUrl(`/tree/${person.person.id}`, $page.url, undefined));
          return;
        }
      } else {
        // user clicked on different person, move PopUp to them
        popup.person = person;
        popup.control?.update();
        popup.comp?.reset(person.person);
        popup.timeOpened = Date.now();
      }
    } else {
      // open a new PopUp
      popup.person = person;
      popup.control?.show();
      popup.timeOpened = Date.now();
    }
    dontClosePopup = true;
  }

  function onPopUpClick(event: MouseEvent) {
    dontClosePopup = true;
  }

  function onWindowClick(event: MouseEvent) {
    if (dontClosePopup) {
      dontClosePopup = false;
    } else {
      if (popup.comp?.tryClose()) {
        popup.control?.hide();
      }
    }
  }

  let wrapperElem: HTMLDivElement;
  const wrapperDimensions = { x: 0, y: 0, width: 0, height: 0 };

  function drawLinesToChildren(context: CanvasRenderingContext2D, children: PersonData[], startPoint: Point, childConnectLineY: number, vLineHeight: number, negOffset: Point) {
    if (children.length < 1) {
      return;
    }
    // find all node centers and range of x values
    const childPoints: Point[] = children.map(c => c.node.center(negOffset));
    const [minX, maxX] = minAndMax(childPoints.map(p => p.x));
    const xMid = (minX + maxX) / 2;
    if (xMid !== startPoint.x) {
      const sp2: Point = { x: xMid, y: childConnectLineY - vLineHeight };
      const mid: Point = { x: startPoint.x, y: sp2.y };
      drawLine(context, startPoint, mid);
      drawLine(context, mid, sp2);
      startPoint = sp2;
    }
    drawLine(context, startPoint, { x: xMid, y: childConnectLineY });
    drawLine(context, { x: minX, y: childConnectLineY }, { x: maxX, y: childConnectLineY })
    for (const cp of childPoints) {
      drawLine(context, { x: cp.x, y: childConnectLineY }, cp);
    }
  }
  function drawLinesToParents(context: CanvasRenderingContext2D, person: typeof focusPeople[number], negOffset: Point) {
    if (person.parents.length < 1) {
      return;
    }
    const focusMiddle = person.node.center(negOffset);
    let parentsMiddle: Point;
    
    // draw a line between parents if needed and calculate parents' midpoint
    if (person.parents.length === 1) {
      parentsMiddle = person.parents[0].node.center(negOffset);
    } else {
      const parent1 = person.parents[0].node.center(negOffset);
      const parent2 = person.parents[1].node.center(negOffset);
      parentsMiddle = findMidPoint(parent1, parent2);
      drawLine(context, parent1, parent2);
    }
    
    // draw a line between person and parents' midpoint
    const midY = (focusMiddle.y + parentsMiddle.y) / 2;
    const mp1: Point = { x: focusMiddle.x, y: midY };
    const mp2: Point = { x: parentsMiddle.x, y: midY };
    drawLine(context, focusMiddle, mp1);
    drawLine(context, mp1, mp2);
    drawLine(context, mp2, parentsMiddle);
  }
  function redraw() {
    wrapperDimensions.x = wrapperElem.getBoundingClientRect().x;
    wrapperDimensions.y = wrapperElem.getBoundingClientRect().y;

    // Init canvas context
    const context = cnv.getContext('2d') as CanvasRenderingContext2D;
    context.lineWidth = 10;
    const lineBrightness = 255 * themeDarkVal;
    context.strokeStyle = `rgb(${lineBrightness} ${lineBrightness} ${lineBrightness})`;
    context.lineCap = 'round';
    context.clearRect(0, 0, cnv.width, cnv.height);
    context.beginPath();

    // Middle of nodes in the "focus" group
    let middle: Point, fpL: Point, fpR: Point;

    // Line between focus people, if needed
    if (focusPeople.length === 1) {
      fpL = fpR = middle = focusPeople[0].node.center(wrapperDimensions);
    } else if (focusPeople.length > 1) {
      fpL = focusPeople[0].node.center(wrapperDimensions);
      fpR = focusPeople[1].node.center(wrapperDimensions);
      middle = { x: (fpL.x + fpR.x) / 2, y: (fpL.y + fpR.y) / 2 };

      // horizontal focus line
      context.moveTo(fpL.x, fpL.y);
      context.lineTo(fpR.x, fpR.y);
    } else {
      throw Error();
    }

    if (childRows.other !== undefined && childRows.other !== null) {
      const chOthMtMatch = /(\d+)px/.exec(window.getComputedStyle(childRows.other).marginTop);
      const chOthMt = chOthMtMatch === null ? 0.0 : parseFloat(chOthMtMatch[1]);
      const chOthY = childRows.other.getBoundingClientRect().y - wrapperDimensions.y;
      const chOthMg = chOthMt / 3;
      if (children.l.length > 0) {
        drawLinesToChildren(context, children.l, fpL, chOthY - chOthMg, chOthMg, wrapperDimensions);
      }
      if (children.r.length > 0) {
        drawLinesToChildren(context, children.r, fpR, chOthY - chOthMg, chOthMg, wrapperDimensions);
      }
    }
    if (children.s.length > 0 && childRows.shared !== undefined) {
      const chShMtMatch = /(\d+)px/.exec(window.getComputedStyle(childRows.shared).marginTop);
      const chShMt = chShMtMatch === null ? 0.0 : parseFloat(chShMtMatch[1]);
      const chShY = childRows.shared.getBoundingClientRect().y - wrapperDimensions.y;
      drawLinesToChildren(context, children.s, middle, chShY - chShMt / 2, chShMt / 2, wrapperDimensions);
    }

    // lines to parents
    for (const person of focusPeople) {
      drawLinesToParents(context, person, wrapperDimensions);
    }

    // finish drawing all lines
    context.stroke();
  }

  onMount(() => {
    // initial draw on page load
    resizeTimer = setTimeout(redraw, 0);

    // redraw whenever canvas resizes
    resize = new ResizeObserver(() => {
      // redraw immediately
      redraw();

      // occasionally canvas will cleared immediatelly after this, so schedule another redraw in 5 ms
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(redraw, 5);
    });
    resize.observe(cnv);
    const themeUnsub = theme.subscribe(val => themeTween.set(val === 'dark' ? 1 : 0));
    const themeDarkUnsub = themeTween.subscribe(dark => {
      const changed = themeDarkVal !== dark;
      themeDarkVal = dark;
      if (changed && (dark === 0 || dark === 1 || Date.now() - themeDarkLastRedraw > 80)) {
        redraw();
        themeDarkLastRedraw = Date.now();
      }
    });

    return () => {
      resize.unobserve(cnv);
      clearTimeout(resizeTimer);
      themeUnsub();
      themeDarkUnsub();
    };
  });

  // login on user change
  function authChange(user: typeof data.user) {
    redirUserChange(user, 'view', $page.url);
  }
  $: authChange(data.user);

  data.dynamicMenu.set({
    comp: Navbar,
    compProps: { enableAddPerson: true, enableSearchBox: true, searchBoxLinkFunc: (p => `/tree/${p.id}`) satisfies SearchBoxLinkFunc }
  });
</script>

<svelte:window on:click={onWindowClick} />

<svelte:head>
  <title>{m.treeTitle()}</title>
</svelte:head>

<div class="root">
  <div
    class="tree-wrapper"
    bind:clientWidth={wrapperDimensions.width}
    bind:clientHeight={wrapperDimensions.height}
    bind:this={wrapperElem}
  >
    <canvas bind:this={cnv} class="lines-canvas" width={wrapperDimensions.width} height={wrapperDimensions.height}>
    </canvas>
    <div class="row group parents">
      {#each parents as parent}
        <PersonNode bind:this={parent.node} person={parent.person} on:click={() => onPersonClick(parent)} />
      {/each}
    </div>
    <div class="row group focus">
      {#each focusPeople as person}
        <PersonNode bind:this={person.node} person={person.person} on:click={() => onPersonClick(person)} />
      {/each}
    </div>
    {#if children.l.length > 0 || children.r.length > 0}
      <div class="row children other" bind:this={childRows.other}>
        <div class="group otc-side left">
          {#each children.l as child}
          <PersonNode bind:this={child.node} person={child.person} on:click={() => onPersonClick(child)} />
          {/each}
        </div>
        <div class="spacer" />
        <div class="group otc-side right">
          {#each children.r as child}
          <PersonNode bind:this={child.node} person={child.person} on:click={() => onPersonClick(child)} />
          {/each}
        </div>
      </div>
    {/if}
    <div class="row group children shared" bind:this={childRows.shared}>
      {#each children.s as child}
        <PersonNode bind:this={child.node} person={child.person} on:click={() => onPersonClick(child)} />
      {/each}
    </div>
  </div>
</div>

{#if browser}
  <FloatingUiComponent
    bind:control={popup.control}
    virtualElement={popup.virtElem}
    offsetPx={20}
    enableArrow={true}
    arrowShiftPx={13}
    --popup-bg="var(--col-secondary-bg)"
    --popup-border="2px solid var(--col-secondary-border)"
  >
    <PopUp
      style={`background-color: var(--popup-bg, gray); border: var(--popup-border, 1px solid black); transition: background-color ${(TRANS_DELAY / 1000).toFixed(3)}s, border-color ${(TRANS_DELAY / 1000).toFixed(3)}s;`}
      slot="tooltip"
      person={popup.person.person}
      canEdit={data.canEdit}
      bind:this={popup.comp}
      on:click={onPopUpClick}
      on:close={popup.control?.hide}
    />
    <div slot="arrow" class="arrow" />
  </FloatingUiComponent>
{/if}

<style lang="scss">
  @use 'sass:math';
  @use '$lib/styles/common';
  @use '$lib/styles/colors';

  $node-gap: 60px;
  $node-gap-children: 10px;
  $child-line-spacer: $node-gap;

  .root {
    display: flex;
    flex-direction: column;
  }

  .tree-wrapper {
    display: flex;
    flex-direction: column;
    position: relative;
    margin: 40px 25px;
  }

  .group {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: $node-gap;
    &.otc-side {
      gap: $node-gap-children;
      &.left {
        justify-content: flex-end;
      }
      &.right {
        justify-content: flex-start;
      }
    }
    &.children.shared {
      gap: $node-gap-children;
    }
  }

  .row.parents {
    margin-bottom: 75px;
  }

  .row.children {
    &.other {
      @include common.flex($dir: row, $wrap: nowrap, $justifycn: center, $alignit: center);
      margin-top: 90px;
      > .spacer {
        width: $child-line-spacer;
      }
      > .otc-side {
        width: calc(50% - math.div($child-line-spacer, 2));
      }
    }
    &.shared {
      margin-top: 60px;
    }
  }

  .lines-canvas {
    width: 100%;
    height: 100%;
    position: absolute;
    z-index: -1;
  }

  .arrow {
    background-color: var(--popup-bg, gray);
    border: var(--popup-border, 1px solid black);
    @include colors.col-trans($bg: true, $fg: false, $br: true);
    border-right-width: 0;
    border-bottom-width: 0;
    border-bottom-right-radius: 100%;
    width: 25px;
    height: 25px;
  }
</style>
