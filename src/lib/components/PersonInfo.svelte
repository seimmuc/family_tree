<script lang="ts">
  import { nonewlines, toPersonEdit, formatDate, getPersonChanges } from '$lib/client/clutils';
  import type { PersonEdit, PersonChanges } from '$lib/client/clutils';
  import { DATE_MAX_LEN, type PersonData } from '$lib/types';
  import { isDateString } from '$lib/utils';
  import { createEventDispatcher } from 'svelte';
  import { slide, type TransitionConfig } from 'svelte/transition';

  type DateMode = 'date' | 'str';

  export let editMode = false;
  export let person: PersonData;
  export let bioDisplay: string | undefined = undefined;
  export let nameLink: string | undefined = undefined;
  export let transOptions: TransitionConfig = {};
  export let initDateMode: DateMode = 'date';

  const dispatch = createEventDispatcher();
  let editPerson: PersonEdit;
  let birthDM: DateMode;
  let deathDM: DateMode;

  export function reset(newPerson?: PersonData) {
    if (newPerson === undefined) {
      newPerson = person;
    }
    editPerson = toPersonEdit(newPerson);
    birthDM = toViableDM(initDateMode, editPerson.birthDate);
    deathDM = toViableDM(initDateMode, editPerson.deathDate);
  }

  export function getChanges(): PersonChanges {
    return getPersonChanges(person, editPerson);
  }

  export function getPersonEdit(): PersonEdit {
    return editPerson;
  }

  $: dispatch('edit', { edit: editPerson });

  function toViableDM(dateMode: DateMode, dateString: string): DateMode {
    dateString = dateString.trim();
    return dateMode === 'date' && (dateString === '' || isDateString(dateString)) ? 'date' : 'str';
  }

  function toggleDM() {
    const newDM: DateMode = birthDM === 'date' || deathDM === 'date' ? 'str' : 'date';
    birthDM = toViableDM(newDM, editPerson.birthDate);
    deathDM = toViableDM(newDM, editPerson.deathDate);
  }

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
    {#if birthDM === 'date'}
      <input type="date" bind:value={editPerson.birthDate} />
    {:else}
      <input type="text" maxlength={DATE_MAX_LEN} bind:value={editPerson.birthDate} />
    {/if}
    <button type="button" class="switch-format-btn" on:click={toggleDM}>-</button>
    {#if deathDM === 'date'}
      <input type="date" bind:value={editPerson.deathDate} />
    {:else}
      <input type="text" maxlength={DATE_MAX_LEN} bind:value={editPerson.deathDate} />
    {/if}
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
    display: flex;
    flex-direction: row;
    align-items: stretch;
    gap: 0.4em;
    &.display {
      border: 1px solid transparent;
    }
    &.input {
      input {
        background-color: var(--col-secondary-bg, colors.$light-secondary-bg);
        border: 1px solid var(--col-secondary-border, colors.$light-secondary-border);
        border-radius: 2px;
        color: var(--col-fg, colors.$light-text);
        width: 10em;
      }
      .switch-format-btn {
        @include common.styleless-button;
        background-color: var(--col-secondary-bg, colors.$light-secondary-bg);
        border: 1px solid var(--col-secondary-border, colors.$light-secondary-border);
        border-radius: 3px;
        color: var(--col-fg, colors.$light-text);
        @include colors.col-trans($bg: true, $fg: true, $br: true);
        &:hover {
          background-color: var(--col-secondary-border, colors.$light-secondary-border);
        }
      }
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
