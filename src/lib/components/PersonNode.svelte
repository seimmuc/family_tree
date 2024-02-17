<script lang="ts">
	import type { Person } from "$lib/types";
	import type { Point } from "./types";

  export let person: Person;

  let root: HTMLDivElement;

  export function center(negativeOffset: Point): Point {
    const boundingBox = root.getBoundingClientRect();
    return {
      x: boundingBox.x + boundingBox.width / 2 - negativeOffset.x,
      y: boundingBox.y + boundingBox.height / 2 - negativeOffset.y
    }
  }
</script>

<div bind:this={root} class="person self">{person.firstName}</div>

<style>
  .person {
    background-color: white;
    color: black;
    width: 70px;
    aspect-ratio: 1/1;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 20px;
    border: black solid 2px;
  }
</style>