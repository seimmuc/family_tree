<script lang="ts">
  import { FontAwesomeIcon } from "@fortawesome/svelte-fontawesome";
  import { faXmark } from "@fortawesome/free-solid-svg-icons";
  import { faPenToSquare, faFloppyDisk } from "@fortawesome/free-regular-svg-icons";
	import type { Person } from "$lib/types";
	import type { Point } from "./types";
  import { createEventDispatcher } from 'svelte';

  export let person: Person;
  export let position: Point;

  let editMode = false;
  const dispatch = createEventDispatcher();

  function toggleEditMode() {
    editMode = !editMode;
  }

  function close() {
    dispatch("close");
  }
</script>

<svelte:window on:keydown={(e) => {if (e.key === "Escape") {close()}}} />

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="pop-up" style="left: {position.x}px; top: {position.y}px" on:click>
  <div class="top-bar">
    <button class="top-button" on:click={toggleEditMode}><FontAwesomeIcon icon={faPenToSquare} /></button>
    {#if editMode}
      <input type="text" bind:value={person.firstName}/>
    {:else}
      <h1 class="personName">{person.firstName}</h1>
    {/if}
    <button class="top-button" on:click={close}><FontAwesomeIcon icon={faXmark} /></button>
  </div>
  <div class="main-content">
    <div class="dates">
      {#if editMode}
        <input type="date" bind:value={person.birthDate}/>
        <input type="date" bind:value={person.deathDate}/>
      {:else}
        <h3 class="personBirth">{person?.birthDate} - {person?.deathDate}</h3>
      {/if}
    </div>
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
    display: flex;
    flex-direction: column;
    padding: 20px 20px 5px 20px;
  }

  .top-button {
    background: none;
    color: inherit;
    border: none;
    padding: 10px;
    font: inherit;
    cursor: pointer;
    outline: inherit;
  }
</style>