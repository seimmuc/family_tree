<script context="module" lang="ts">
  export type FloatingUICompControl = { show: () => boolean; hide: () => boolean; setVisible: (visible: boolean) => boolean; isVisible: () => boolean; update: UpdatePosition; };
</script>

<script lang="ts">
  import { offset, flip, shift, autoPlacement, type VirtualElement } from "svelte-floating-ui/dom";
  import { arrow, createFloatingActions, type UpdatePosition } from "svelte-floating-ui";
  import { type Placement } from '@floating-ui/utils';
	import { writable } from "svelte/store";

  export let placementDir: Placement = 'bottom';
  export let offsetPx = 8;

  export let arrowShiftPx = offsetPx / 2;
  export let autoPlace = false;
  export let virtualElement: VirtualElement | undefined = undefined;

  const arrowRef = writable<HTMLDivElement | null>(null);

  export const [ floatingRef, floatingContent, update ] = createFloatingActions({
    strategy: "absolute",
    placement: placementDir,
    middleware: [
      offset(offsetPx),
      autoPlace? autoPlacement() : flip(),
      shift(),
      arrow({ element: arrowRef })
    ],
    onComputed({ placement, middlewareData }) {
      const {x, y} = middlewareData.arrow as {x?: number, y?: number};

      const [staticSide, rotation] = {
        top: ['bottom', 225],
        right: ['left', 315],
        bottom: ['top', 45],
        left: ['right', 135],
      }[placement.split('-')[0]] as [string, number];

      const arrw = $arrowRef;
      if (arrw !== null) {
        Object.assign(arrw.style, {
          position: 'absolute',
          left: x != undefined ? `${x}px` : '',
          top: y != undefined ? `${y}px` : '',
          bottom: '',
          right: '',
          [staticSide]: `-${arrowShiftPx}px`,
          transform: `rotate(${rotation}deg)`
        });
      }
    }
  });

  let shown: boolean = false;
  export const control: FloatingUICompControl = {
    show: () => shown = true,
    hide: () => shown = false,
    setVisible: (visible: boolean) => shown = visible,
    isVisible: () => shown,
    update
  }

  if (virtualElement) {
    floatingRef(virtualElement);
  }
</script>

<slot name="ref" {floatingRef} {control} />

{#if shown}
  <div class="tooltip" use:floatingContent>
    <slot name="tooltip" />
    <div class="arrow" bind:this={$arrowRef}>
      <slot name="arrow" />
    </div>
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