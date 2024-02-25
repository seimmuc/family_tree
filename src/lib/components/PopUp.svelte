<script lang="ts">
  import { FontAwesomeIcon } from "@fortawesome/svelte-fontawesome";
  import { faXmark } from "@fortawesome/free-solid-svg-icons";
  import { faPenToSquare, faFloppyDisk } from "@fortawesome/free-regular-svg-icons";
	import type { Person } from "$lib/types";
	import { createEventDispatcher } from 'svelte';
	import { enhance } from "$app/forms";
	
  export let person: Person;
  export let style: string = '';

  const dateFormatOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }
  const bioMaxLength = 50;

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
<div class="pop-up" style={style} on:click>
  <form method="POST" action="?/updatePerson" use:enhance enctype="multipart/form-data">
    <input type="hidden" name="id" value="{person.id}">
    <div class="top-bar">
      {#if editMode}
        <button class="top-button" type="submit"> 
          <FontAwesomeIcon icon={faFloppyDisk} />
        </button>
      {:else}
        <button class="top-button" type="button" on:click={toggleEditMode}>
          <FontAwesomeIcon icon={faPenToSquare} />
        </button>
      {/if}
      {#if editMode}
        <input class="personName" type="text" name="name" bind:value={person.name} size="{person.name.length}"/>
      {:else}
        <h1 class="personName"><a href="/details/{person.id}">{person.name}</a></h1>
      {/if}
      <button class="top-button" type="button" on:click={close}>
        <FontAwesomeIcon icon={faXmark} />
      </button>
    </div>
    <div class="main-content">
      <div class="dates">
        {#if editMode}
          <input class="date-input" type="date" name="birthDate" bind:value={person.birthDate}/>
          <input class="date-input" type="date" name="deathDate" bind:value={person.deathDate}/>
        {:else}
          <h3 class="personBirth">{person.birthDate?.toLocaleDateString(undefined, dateFormatOptions)} - {person.deathDate?.toLocaleDateString(undefined, dateFormatOptions)}</h3>
        {/if}
      </div>
      <br>
      {#if editMode}
        <textarea class="bio" name="bio" bind:value={person.bio}></textarea>  
      {:else}
        <p class="bio">{person.bio ? (person.bio.length > bioMaxLength ? person.bio.substring(0, bioMaxLength) + "..." : person.bio) : ""}</p>
      {/if} 
    </div>
  </form>
</div>

<style>
  .pop-up {
    max-width: 500px;
  }

  .personName {
    margin: 0px;
    margin-top: 20px;
    font-size: 36px;
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
    padding: 20px 20px 20px 20px;
    align-items: center;
    gap: 10px;
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

  .bio {
    width: 100%;
    height: max-content;
    overflow-wrap: anywhere;
  }

  textarea.bio {
    width: 420px;
    height: 129px;
  }

  .date-input {
    font-size: 24px;
  }
</style>