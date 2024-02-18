<script lang="ts">
	import type { Person } from "$lib/types";
	import type { Point } from "./types";

  export let person: Person | undefined;
  export let position: Point;
</script>

<div class="pop-up" style="left: {position.x}px; top: {position.y}px">
  <h1 class="personName">{person?.firstName}</h1>
  <h3 class="personBirth">{person?.birthDate} - {person?.deathDate}</h3>
  <p>{person?.bio}</p>
  
</div>

<style>
  .pop-up {
    position: absolute;
    background-color: color-mix(in hsl, var(--bg-color) 60%, gray);
    padding: 15px 15px 0px 15px;
    border: solid 2px black;
    transform: translateX(-50%) translateY(20px);
  }

  .personName {
    margin: 0px;
  }

  .personBirth {
    margin: 3px 0;
  }
</style>