<script context="module" lang="ts">
  export type FloatingUICompControl = {
    show: () => void;
    hide: () => void;
    toggle: () => void;
    setVisible: (visible: boolean) => void;
    isVisible: () => boolean;
    update: UpdatePosition;
  };
</script>

<script lang="ts">
  import { offset, flip, shift, autoPlacement, type VirtualElement } from 'svelte-floating-ui/dom';
  import { arrow, createFloatingActions, type UpdatePosition, type ComputeConfig } from 'svelte-floating-ui';
  import { type Placement } from '@floating-ui/utils';
  import { writable } from 'svelte/store';
  import { arrayHasAny } from '$lib/utils';
  import type { Middleware } from '@floating-ui/core';

  export let placementDir: Placement = 'bottom';
  export let offsetPx = 8;
  export let enableArrow = false;
  export let arrowShiftPx = offsetPx / 2; // the default value isn't intended to be reactive
  export let autoPlace = false;
  export let virtualElement: VirtualElement | undefined = undefined;
  export let style: string | undefined = undefined;

  let oldParams: Record<string, any> = {}; // keeps track of all params except virtualElement and style

  // ComputeConfig static values
  const arrowRef = writable<HTMLDivElement | null>(null);
  const staticMiddleware: Array<Middleware> = [shift()];
  const computeConfig: ComputeConfig = {
    strategy: 'absolute',
    onComputed({ placement, middlewareData }) {
      if (middlewareData.arrow) {
        const { x, y } = middlewareData.arrow as { x?: number; y?: number };
        const [staticSide, rotation] = {
          top: ['bottom', 225],
          right: ['left', 315],
          bottom: ['top', 45],
          left: ['right', 135]
        }[placement.split('-')[0]] as [string, number];
        const arrw = $arrowRef;
        if (arrw !== null) {
          Object.assign(arrw.style, {
            position: 'absolute',
            left: x !== undefined ? `${x}px` : '',
            top: y !== undefined ? `${y}px` : '',
            bottom: '',
            right: '',
            [staticSide]: `-${arrowShiftPx}px`,
            transform: `rotate(${rotation}deg)`
          });
        }
      }
    }
  };
  // ComputeConfig dynamic updates
  let mwOffset: Middleware | undefined;
  let mwPlace: Middleware;
  let mwArrow: Middleware | undefined;
  function updateComputeConfig(
    placementDir: Placement,
    offsetPx: number,
    enableArrow: boolean,
    arrowShiftPx: number,
    autoPlace: boolean
  ): boolean {
    // update things as lazily as possible
    const newParams = { placementDir, offsetPx, enableArrow, arrowShiftPx, autoPlace };
    const changes = Object.entries(newParams)
      .filter(([k, v]) => v !== oldParams[k])
      .map(e => e[0]);
    if (changes.length < 1) {
      return false;
    }
    if (arrayHasAny(changes, ['offsetPx', 'autoPlace', 'enableArrow'])) {
      // middleware
      if (changes.includes('offsetPx')) {
        mwOffset = offsetPx ? offset(offsetPx) : undefined;
      }
      if (changes.includes('autoPlace')) {
        mwPlace = autoPlace ? autoPlacement() : flip();
      }
      if (changes.includes('enableArrow')) {
        mwArrow = enableArrow ? arrow({ element: arrowRef }) : undefined;
      }
      computeConfig.middleware = [...staticMiddleware, mwOffset, mwPlace, mwArrow];
    }
    if (changes.includes('placementDir')) {
      computeConfig.placement = placementDir;
    }
    oldParams = newParams;
    return true;
  }
  // run the update initially (before createFloatingActions() call)
  updateComputeConfig(placementDir, offsetPx, enableArrow, arrowShiftPx, autoPlace); // initial call (reactive updates will only run after dom mount)
  // setup reactive updates on prop changes (initial call only happens after <script> completes)
  $: if (updateComputeConfig(placementDir, offsetPx, enableArrow, arrowShiftPx, autoPlace)) {
    update(computeConfig);
  }

  const [floatingRef, floatingContent, update] = createFloatingActions(computeConfig);

  let shown: boolean = false;
  export const control: FloatingUICompControl = {
    show: () => {
      shown = true;
    },
    hide: () => {
      shown = false;
    },
    toggle: () => {
      shown = !shown;
    },
    setVisible: (visible: boolean) => {
      shown = visible;
    },
    isVisible: () => shown,
    update
  };

  $: if (virtualElement) {
    floatingRef(virtualElement);
  }
</script>

<slot name="ref" {floatingRef} {control} />

{#if shown}
  <div class="tooltip" {style} use:floatingContent>
    <slot name="tooltip" />
    {#if enableArrow}
      <div class="arrow" bind:this={$arrowRef}>
        <slot name="arrow" />
      </div>
    {/if}
  </div>
{/if}

<style>
  .tooltip {
    position: absolute;
  }
  .arrow {
    position: absolute;
  }
</style>
