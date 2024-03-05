<script lang="ts">
  import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
  import { faXmark } from '@fortawesome/free-solid-svg-icons';
  import { faPenToSquare, faFloppyDisk } from '@fortawesome/free-regular-svg-icons';
  import type { Person, UpdatablePerson } from '$lib/types';
  import { createEventDispatcher } from 'svelte';
  import { isDateString, stripNonPrintableAndNormalize } from '$lib/utils';
  import { enhance } from '$app/forms';
  import type { SubmitFunction } from '@sveltejs/kit';
  import { slide } from 'svelte/transition';
  import { formatDate, truncateString } from '$lib/client/clutils';

  export let person: Person;
  export let style: string = '';

  const bioMaxLength = 50;
  const bioMaxLines = 4;
  type PersonChanges = { name?: string; bio?: string | null; birthDate?: string | null; deathDate?: string | null };

  const dispatch = createEventDispatcher();
  let editMode: boolean = false;
  let editPerson: { name: string; bio: string; birthDate?: string; deathDate?: string };
  let shortenedBio: string | undefined = undefined;
  let bioIsLong: boolean = false;
  let showFullBio: boolean = false;

  function toggleEditMode() {
    editMode = !editMode;
  }

  // Prevent user from entering newlines in the name field
  function onNameKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  }
  function onNamePaste(e: ClipboardEvent) {
    const text = e.clipboardData?.getData('text');
    if (text?.includes('\n')) {
      e.preventDefault();
    }
  }

  /**
   * Returns an object with person properties that need to be changed, null value means that that property should be removed, undefined values should be ignored
   */
  function changes(): PersonChanges {
    const name = stripNonPrintableAndNormalize(editPerson.name, false, true);
    const bio = stripNonPrintableAndNormalize(editPerson.bio, false, false) || undefined;
    const bd = isDateString(editPerson.birthDate) ? editPerson.birthDate : undefined;
    const dd = isDateString(editPerson.deathDate) ? editPerson.deathDate : undefined;
    return {
      name: name !== person.name ? name : undefined,
      bio: bio !== person.bio ? bio ?? null : undefined,
      birthDate: bd !== person.birthDate ? bd ?? null : undefined,
      deathDate: dd !== person.deathDate ? dd ?? null : undefined
    };
  }

  function actionCancel() {
    editMode = false;
  }
  const submitUpdate: SubmitFunction = ({ formData, cancel }) => {
    const ch = changes();
    if (ch.name?.trim() === '') {
      // name is too short
      cancel();
      return;
    }
    ch.name ??= person.name; // name cannot be removed, and should not be sent to server as undefined
    const updatePerson: UpdatablePerson = { id: person.id, ...(ch as PersonChanges & { name: string }) };
    formData.append('person-update', JSON.stringify(updatePerson));
    editMode = false;
  };

  export function reset(newPerson?: Person) {
    editMode = false;
    const p = newPerson ?? person;
    editPerson = { name: p.name, bio: p.bio ?? '', birthDate: p.birthDate, deathDate: p.deathDate };
    const [sb, lb] = truncateString(p.bio ?? '', bioMaxLength, bioMaxLines);
    shortenedBio = lb ? sb.trimEnd() + '…' : undefined;
    bioIsLong = lb;
    showFullBio = false;
  }
  export function tryClose(): boolean {
    return !editMode || Object.keys(changes()).length < 1;
  }

  function close() {
    dispatch('close');
  }
  reset();
</script>

<svelte:window
  on:keydown={e => {
    if (e.key === 'Escape') {
      close();
    }
  }}
/>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="pop-up" {style} on:click>
  <form method="POST" action="?/updatePerson" enctype="multipart/form-data" use:enhance={submitUpdate}>
    <input type="hidden" name="id" value={person.id} />
    <div class="top-bar">
      {#if editMode && false}
        <button class="top-button" type="submit">
          <FontAwesomeIcon icon={faFloppyDisk} />
        </button>
      {:else}
        <button class="top-button" type="button" on:click={toggleEditMode}>
          <FontAwesomeIcon icon={faPenToSquare} />
        </button>
      {/if}
      {#if editMode}
        <h1
          class="personName"
          contenteditable="plaintext-only"
          bind:textContent={editPerson.name}
          on:keydown={onNameKeydown}
          on:paste={onNamePaste}
        ></h1>
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
          <div transition:slide={{ duration: 200, axis: 'y' }}>
            <input class="date-input" type="date" bind:value={editPerson.birthDate} />
            <input class="date-input" type="date" bind:value={editPerson.deathDate} />
          </div>
        {:else}
          <h3 class="date-display" transition:slide={{ duration: 200, axis: 'y' }}>
            {formatDate(person.birthDate, 'birth')} - {formatDate(person.deathDate, 'death')}
          </h3>
        {/if}
      </div>
      {#if editMode}
        <p class="bio" contenteditable="plaintext-only" bind:textContent={editPerson.bio} />
      {:else}
        <!-- <p class="bio">{person.bio ? (person.bio.length > bioMaxLength ? person.bio.substring(0, bioMaxLength) + "…" : person.bio) : ""}</p> -->
        <p class="bio">{!bioIsLong || showFullBio ? person.bio : shortenedBio}</p>
        {#if bioIsLong}
          <button
            type="button"
            class="button-show-more"
            transition:slide={{ duration: 200, axis: 'y' }}
            on:click={() => (showFullBio = !showFullBio)}>{showFullBio ? 'Show less' : 'Show more'}</button
          >
        {/if}
      {/if}
      {#if editMode}
        <div class="form-buttons" transition:slide={{ duration: 200, axis: 'y' }}>
          <button type="submit" disabled={editPerson.name.length < 1}>Save</button>
          <button type="button" on:click={actionCancel}>Cancel</button>
        </div>
      {/if}
    </div>
  </form>
</div>

<style lang="scss">
  @mixin contenteditable-border {
    border: 1px solid transparent;
    border-radius: 4px;
    &[contenteditable] {
      border-color: #eee;
      padding: 0 3px;
    }
  }
  @mixin styleless-button {
    background: none;
    color: inherit;
    border: none;
    cursor: pointer;
  }
  @mixin link-colors {
    color: lightgray;
    &:hover {
      color: gray;
    }
  }

  .pop-up {
    max-width: 600px;
  }

  .top-bar {
    display: flex;
    justify-content: space-between;
    align-items: stretch;
    margin-bottom: 4px;
    z-index: 3;

    .personName {
      margin: 9px 2px 0;
      font-size: 2em;
      @include contenteditable-border;
      a {
        @include link-colors;
        text-decoration: none;
      }
    }
    .top-button {
      @include styleless-button;
      padding: 11px;
      font-size: 1.4em;
    }
  }

  .main-content {
    display: flex;
    flex-direction: column;
    padding: 0 10px 20px;
    align-items: center;
    .dates {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin: 15px 0;
      .date-display,
      .date-input {
        margin: 0;
      }
    }
    .bio {
      overflow-wrap: anywhere;
      white-space: pre-line;
      text-align: center;
      margin: 0;
      @include contenteditable-border;
    }
    .button-show-more {
      @include styleless-button;
      @include link-colors;
    }
    .form-buttons {
      margin-top: 12px;
    }
  }
</style>
