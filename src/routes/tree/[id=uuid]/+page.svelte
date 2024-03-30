<script lang="ts">
  import { browser } from '$app/environment';
  import { TRANS_DELAY } from '$lib/client/clutils.js';
  import { theme } from '$lib/client/stores.js';
  import FloatingUiComponent, { type FloatingUICompControl } from '$lib/components/FloatingUIComponent.svelte';
  import PersonNode from '$lib/components/PersonNode.svelte';
  import PopUp from '$lib/components/PopUp.svelte';
  import SearchBox, { type SearchBoxLinkFunc } from '$lib/components/SearchBox.svelte';
  import type { Point } from '$lib/components/types.js';
  import { type Person } from '$lib/types.js';
  import { type ClientRectObject } from '@floating-ui/core';
  import { onMount } from 'svelte';
  import { tweened } from 'svelte/motion';

  export let data;

  let cnv: HTMLCanvasElement;
  let resize: ResizeObserver;
  let resizeTimer: NodeJS.Timeout | number;
  let themeDarkVal = data.theme === 'dark' ? 1 : 0;
  const themeTween = tweened(themeDarkVal, { duration: TRANS_DELAY });
  let themeDarkLastRedraw: number = 0;

  type PersonData = { person: Person; node: PersonNode };
  let focusPeople: Array<PersonData & { parents: PersonData[] }>;
  let parents: Array<PersonData & { child: string }>;
  let children: Array<PersonData>;

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
    children = data.children
      .map(cId => pplMap[cId])
      .filter(c => c !== undefined)
      .map(element => {
        return { person: element as Person, node: undefined as any as PersonNode };
      });
    parents.forEach(p => {
      focusPeople.find(fp => fp.person.id === p.child)?.parents.push(p);
    });
    if (popup.control?.isVisible()) {
      // popup.person.node will be unbound and undefined after upcoming DOM update, we need to relink popup with new PersonData object
      const personId = popup.person.person.id;
      pdloop: for (let pdArr of [focusPeople, parents, children]) {
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

  // Pop-Up open
  function onPersonClick(person: PersonData) {
    popup.person = person;
    if (popup.control?.isVisible()) {
      popup.control?.update();
      popup.comp?.reset(person.person);
    } else {
      popup.control?.show();
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

  function redraw() {
    wrapperDimensions.x = wrapperElem.getBoundingClientRect().x;
    wrapperDimensions.y = wrapperElem.getBoundingClientRect().y;

    // Init canvas context
    const context = cnv.getContext('2d') as CanvasRenderingContext2D;
    context.lineWidth = 10;
    const lineBrightness = 255 * themeDarkVal;
    context.strokeStyle = `rgb(${lineBrightness} ${lineBrightness} ${lineBrightness})`;
    context.lineCap = 'square';
    context.clearRect(0, 0, cnv.width, cnv.height);
    context.beginPath();

    // Middle of nodes in the "focus" group
    let middle: Point;

    if (focusPeople.length === 1) {
      middle = focusPeople[0].node.center(wrapperDimensions);
    } else if (focusPeople.length > 1) {
      const center1 = focusPeople[0].node.center(wrapperDimensions);
      const center2 = focusPeople[1].node.center(wrapperDimensions);
      middle = { x: (center1.x + center2.x) / 2, y: (center1.y + center2.y) / 2 };

      // horizontal focus line
      context.moveTo(center1.x, center1.y);
      context.lineTo(center2.x, center2.y);
    } else {
      throw Error();
    }

    if (children.length > 0) {
      const childPoints = children.map(element => element.node.center(wrapperDimensions));
      const childNodeY = children[0].node.center(wrapperDimensions).y;
      const c1p2: Point = { x: middle.x, y: (middle.y + childNodeY) / 2 };
      const c2p1: Point = { x: childPoints[0].x, y: c1p2.y };
      const c2p2: Point = { x: childPoints[childPoints.length - 1].x, y: c1p2.y };

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

    for (const person of focusPeople) {
      if (person.parents.length < 1) {
        continue;
      }
      const focusMiddle = person.node.center(wrapperDimensions);
      if (person.parents.length > 1) {
        const center1 = person.parents[0].node.center(wrapperDimensions);
        const center2 = person.parents[1].node.center(wrapperDimensions);
        const parentsMiddle = { x: (center1.x + center2.x) / 2, y: (center1.y + center2.y) / 2 };
        context.moveTo(focusMiddle.x, focusMiddle.y);
        context.lineTo(parentsMiddle.x, parentsMiddle.y);
        context.moveTo(center1.x, center1.y);
        context.lineTo(center2.x, center2.y);
      } else {
        const center = person.parents[0].node.center(wrapperDimensions);
        context.moveTo(focusMiddle.x, focusMiddle.y);
        context.lineTo(center.x, center.y);
      }
    }

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

  data.dynamicMenu.set({comp: SearchBox, compProps: { linkFunc: (p => `/tree/${p.id}`) satisfies SearchBoxLinkFunc }});
</script>

<svelte:window on:click={onWindowClick} />

<div class="root">
  <div
    class="tree-wrapper"
    bind:clientWidth={wrapperDimensions.width}
    bind:clientHeight={wrapperDimensions.height}
    bind:this={wrapperElem}
  >
    <canvas bind:this={cnv} class="lines-canvas" width={wrapperDimensions.width} height={wrapperDimensions.height}>
    </canvas>
    <div class="row parents">
      {#each parents as parent}
        <PersonNode bind:this={parent.node} person={parent.person} on:click={() => onPersonClick(parent)} />
      {/each}
    </div>
    <div class="row focus">
      {#each focusPeople as person}
        <PersonNode bind:this={person.node} person={person.person} on:click={() => onPersonClick(person)} />
      {/each}
    </div>
    <div class="row children">
      {#each children as child}
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
      style="background-color: var(--popup-bg, gray); border: var(--popup-border, 1px solid black); transition: background-color {(TRANS_DELAY / 1000).toFixed(3)}s, border-color {(TRANS_DELAY / 1000).toFixed(3)}s;"
      slot="tooltip"
      person={popup.person.person}
      bind:this={popup.comp}
      on:click={onPopUpClick}
      on:close={popup.control?.hide}
    />
    <div slot="arrow" class="arrow" />
  </FloatingUiComponent>
{/if}

<style lang="scss">
  @use '$lib/styles/colors';
  .root {
    display: flex;
    flex-direction: column;
  }

  .tree-wrapper {
    display: flex;
    flex-direction: column;
    position: relative;
    margin: 50px 25px;
  }

  .row {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 60px;
  }

  .row.parents {
    margin-bottom: 75px;
  }

  .row.children {
    margin-top: 150px;
    gap: 20px;
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
