<script lang="ts">
	import type { Person } from "$lib/types";

  export let person: Person;
</script>
<div class="person self">{person.firstName}</div>

<style>
  .person {
    background-color: white;
    color: black;
    width: fit-content;
    aspect-ratio: 1/1;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 20px;
    border: black solid 2px;
  }
</style>