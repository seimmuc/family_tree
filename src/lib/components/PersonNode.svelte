<script lang="ts">
  import { portraitUrl } from '$lib/client/clutils';
  import type { PersonData } from '$lib/types/person';
  import { clampNum } from '$lib/utils';
  import type { Point } from '$lib/drawutils';

  export let person: PersonData;

  $: bgImgSt = person.portrait ? `url(${portraitUrl(person)})` : 'none';
  $: fontSize = `${clampNum(12.75 / longestNamePartLength(person.name), 1.2, 2.2)}em`;

  let root: HTMLButtonElement;

  export function center(negativeOffset: Point): Point {
    const boundingBox = root.getBoundingClientRect();
    return {
      x: boundingBox.x + boundingBox.width / 2 - negativeOffset.x,
      y: boundingBox.y + boundingBox.height / 2 - negativeOffset.y
    };
  }
  export function bottomCenter(): Point {
    const boundingBox = root.getBoundingClientRect();
    return {
      x: boundingBox.x + boundingBox.width / 2,
      y: boundingBox.y + boundingBox.height
    };
  }
  export function boundBox(): DOMRect {
    return root.getBoundingClientRect();
  }
  const longestNamePartLength = (name: string) => name.split(/[\s-]/).reduce((a, p) => Math.max(a, p.length), 0);
</script>

<button bind:this={root} class="person" style:background-image={bgImgSt} on:click>
  <span class="name" class:blurbg={person.portrait !== undefined} style:font-size={fontSize}>{person.name}</span>
</button>

<style lang="scss">
  @use '$lib/styles/common';

  $name-edge-blur-x: 5px;
  $name-edge-blur-y: 5px;
  $name-edge-blur-x-pad: 4px;
  $name-edge-blur-y-pad: 0px;

  .person {
    background-color: white;
    width: 12.5em;
    height: 12.5em;
    aspect-ratio: 1/1;
    border-radius: 50%;
    @include common.flex-center;
    padding: 15px;
    border: black solid 2px;
    cursor: pointer;
    background-origin: border-box;
    background-repeat: no-repeat;
    background-size: cover;
    background-position: top;
  }
  .name {
    position: relative;
    font-size: 1.7em;
    color: black;
    font-weight: bold;
    // font-weight: 1000;
    -webkit-text-stroke: 0.5px #fff;
    word-break: break-word;
    &.blurbg {
      text-shadow:
        white 0 0 4px,
        white 0 0 4px;
      padding: ($name-edge-blur-y + $name-edge-blur-y-pad) ($name-edge-blur-x + $name-edge-blur-x-pad);
      mask: linear-gradient(
          to bottom,
          transparent 0%,
          black $name-edge-blur-y,
          black calc(100% - $name-edge-blur-y),
          transparent 100%
        ),
        linear-gradient(
          to right,
          black 0%,
          transparent $name-edge-blur-x,
          transparent calc(100% - $name-edge-blur-x),
          black 100%
        );
      mask-composite: subtract;
      background-color: #fff2;
      backdrop-filter: blur(2px);
    }
  }
</style>
