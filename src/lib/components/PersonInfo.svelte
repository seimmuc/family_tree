<script lang="ts">
  import { nonewlines, toPersonEdit, formatDate, getPersonChanges } from '$lib/client/clutils';
  import type { PersonEdit, PersonChanges } from '$lib/client/clutils';
  import type { PersonData } from '$lib/types';
  import { createEventDispatcher } from 'svelte';
  import { slide, type TransitionConfig } from 'svelte/transition';

  export let editMode = false;
  export let person: PersonData;
  export let bioDisplay: string | undefined = undefined;
  export let nameLink: string | undefined = undefined;
  export let transOptions: TransitionConfig = {};

  const dispatch = createEventDispatcher();
  let editPerson: PersonEdit;

  export function reset(newPerson?: PersonData) {
    if (newPerson === undefined) {
      newPerson = person;
    }
    editPerson = toPersonEdit(newPerson);
  }

  export function getChanges(): PersonChanges {
    return getPersonChanges(person, editPerson);
  }

  export function getPersonEdit(): PersonEdit {
    return editPerson;
  }

  $: dispatch('edit', { edit: editPerson });

  reset(person);
</script>

<div class="name-bar">
  <slot name="name-left"><div /></slot>
  {#if editMode}
    <h1 class="name" contenteditable="plaintext-only" bind:textContent={editPerson.name} use:nonewlines on:returnkey />
  {:else}
    <h1 class="name">
      {#if nameLink}
        <a href={nameLink}>{person.name}</a>
      {:else}
        {person.name}
      {/if}
    </h1>
  {/if}
  <slot name="name-right"><div /></slot>
</div>

{#if editMode}
  <div class="date input" transition:slide={{ axis: 'y', ...transOptions }}>
    <input type="date" bind:value={editPerson.birthDate} />
    <input type="date" bind:value={editPerson.deathDate} />
  </div>
{:else}
  <h4 class="date display" transition:slide={{ axis: 'y', ...transOptions }}>
    {formatDate(person.birthDate, 'birth')} - {formatDate(person.deathDate, 'death')}
  </h4>
{/if}

{#if editMode}
  <p class="bio" contenteditable="plaintext-only" bind:textContent={editPerson.bio} />
{:else}
  <p class="bio">{bioDisplay ? bioDisplay : person.bio}</p>
{/if}

<style lang="scss">
  @use '$lib/styles/common';
  @use '$lib/styles/colors';

  .name-bar {
    width: 100%;
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    justify-content: space-between;
    align-items: stretch;
    margin-bottom: var(--pi-name-margin-bottom, 0);
    .name {
      margin: 0.2em 0 0;
      @include common.contenteditable-border;
      @include colors.col-trans($bg: false, $fg: true, $br: true);
      a {
        @include common.link;
      }
    }
  }
  .date {
    margin: var(--pi-date-margin, 4px 0 0);
    font-size: var(--pi-date-font-size, inherit);
    font-weight: var(--pi-date-font-weight, bold);
    @include colors.col-trans($bg: true, $fg: true, $br: true);
    &.display {
      border: 1px solid transparent;
    }
    &.input input {
      background-color: var(--col-secondary-bg, colors.$light-secondary-bg);
      border: 1px solid var(--col-secondary-border, colors.$light-secondary-border);
      border-radius: 2px;
      color: var(--col-fg, colors.$light-text);
    }
  }
  .bio {
    margin: var(--pi-bio-margin, 1.8em 0 1em);
    overflow-wrap: anywhere;
    white-space: pre-line;
    text-align: center;
    @include common.contenteditable-border;
    @include colors.col-trans($bg: false, $fg: true, $br: true);
  }
</style>
