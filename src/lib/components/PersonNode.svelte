<script lang="ts">
	import type { Person } from "$lib/types";
	import type { Point } from "./types";

  export let person: Person;

  let root: HTMLButtonElement;

  export function center(negativeOffset: Point): Point {
    const boundingBox = root.getBoundingClientRect();
    return {
      x: boundingBox.x + boundingBox.width / 2 - negativeOffset.x,
      y: boundingBox.y + boundingBox.height / 2 - negativeOffset.y
    }
  }
  export function bottomCenter(): Point {
    const boundingBox = root.getBoundingClientRect();
    return {
      x: boundingBox.x + boundingBox.width / 2,
      y: boundingBox.y + boundingBox.height
    }
  }
</script>

<button bind:this={root} class="person self" on:click>{person.firstName}</button>

<style>
  .person {
    background-color: white;
    color: black;
    width: 110px;
    aspect-ratio: 1/1;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 20px;
    border: black solid 2px;
    cursor: pointer;
  }
</style>