<script lang="ts">
  import { nonewlines, toPersonEdit, type PersonEdit, formatDate, type PersonChanges, getPersonChanges } from "$lib/client/clutils";
  import type { Person } from "$lib/types";
  import { slide, type TransitionConfig } from "svelte/transition";

  export let editMode = false;
  export let person: Person;
  export let transOptions: TransitionConfig = {};
  
  let editPerson: PersonEdit;

  export function reset(newPerson?: Person) {
    if (newPerson === undefined) {
      newPerson = person;
    }
    editPerson = toPersonEdit(newPerson);
  }

  export function getChanges(): PersonChanges {
    return getPersonChanges(person, editPerson);
  }

  reset(person);
</script>

{#if editMode}
  <h1
    class="name"
    contenteditable="plaintext-only"
    bind:textContent={editPerson.name}
    use:nonewlines
    on:returnkey
  />
{:else}
  <h1 class="name">{person.name}</h1>
{/if}

{#if editMode}
  <div class="date" transition:slide={{ axis: 'y', ...transOptions }}>
    <input type="date" class="date input" bind:value={editPerson.birthDate} />
    <input type="date" class="date input" bind:value={editPerson.deathDate} />
  </div>
{:else}
  <p class="date display" transition:slide={{ axis: 'y', ...transOptions }}>
    {formatDate(person.birthDate, 'birth')} - {formatDate(person.deathDate, 'death')}
  </p>
{/if}

{#if editMode}
  <p class="bio" contenteditable="plaintext-only" bind:textContent={editPerson.bio} />
{:else}
  <p class="bio">{person.bio}</p>
{/if}

<style lang="scss">
  @use '$lib/styles/common';
  @use '$lib/styles/colors';

  .name {
    margin: 0.2em 0 0;
    @include common.contenteditable-border;
    @include colors.col-trans($bg: false, $fg: true, $br: true);
  }
  .date {
    margin: 4px 0 0;
    @include colors.col-trans($bg: true, $fg: true, $br: true);
    &.display {
      border: 1px solid transparent;
    }
    &.input {
      background-color: var(--col-secondary-bg, colors.$light-secondary-bg);
      border: 1px solid var(--col-secondary-border, colors.$light-secondary-border);
      border-radius: 2px;
      color: var(--col-fg, colors.$light-text);
    }
  }
  .bio {
    margin: 1.8em 0 1em;
    overflow-wrap: anywhere;
    white-space: pre-line;
    text-align: center;
    @include common.contenteditable-border;
    @include colors.col-trans($bg: false, $fg: true, $br: true);
  }
</style>
