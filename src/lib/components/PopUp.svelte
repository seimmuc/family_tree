<script lang="ts">
	import type { Person } from "$lib/types";
	import type { Point } from "./types";

  export let person: Person;
  export let position: Point;

  let editMode = false;

  function toggleEditMode() {
    editMode = !editMode;
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="pop-up" style="left: {position.x}px; top: {position.y}px" on:click>
  <div class="top-bar">
    <button class="edit" on:click={toggleEditMode}>Edit</button>
    {#if editMode}
      <input type="text" bind:value={person.firstName}/>
    {:else}
      <h1 class="personName">{person.firstName}</h1>
    {/if}
    <button>X</button>
  </div>
  <div class="main-content">
    {#if editMode}
      <input type="date" bind:value={person.birthDate}/>
      <input type="date" bind:value={person.deathDate}/>
    {:else}
      <h3 class="personBirth">{person?.birthDate} - {person?.deathDate}</h3>
    {/if}
    <br>
    {#if editMode}
      <textarea class="bio" bind:value={person.bio}></textarea>  
    {:else}
      <p>{person?.bio}</p>
    {/if} 
  </div>
  
</div>

<style>
  .pop-up {
    position: absolute;
    background-color: color-mix(in hsl, var(--bg-color) 60%, gray);
    /* padding: 15px 15px 0px 15px; */
    border: solid 2px black;
    transform: translateX(-50%) translateY(20px);
    max-width: 500px;
  }

  .personName {
    margin: 0px;
    margin-top: 20px;
  }

  .personBirth {
    margin: 3px 0;
  }

  .top-bar {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .main-content {
    padding: 20px 20px 5px 20px;
  }
</style>