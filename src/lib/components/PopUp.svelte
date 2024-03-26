<script lang="ts">
  import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
  import { faXmark } from '@fortawesome/free-solid-svg-icons';
  import { faPenToSquare, faFloppyDisk } from '@fortawesome/free-regular-svg-icons';
  import type { Person, UpdatablePerson } from '$lib/types';
  import { createEventDispatcher } from 'svelte';
  import { enhance } from '$app/forms';
  import type { SubmitFunction } from '@sveltejs/kit';
  import { slide } from 'svelte/transition';
  import { formatDate, nonewlines, truncateString, toPersonEdit, getPersonChanges } from '$lib/client/clutils';
  import type { PersonEdit } from '$lib/client/clutils';

  export let person: Person;
  export let style: string = '';

  const bioMaxLength = 50;
  const bioMaxLines = 4;
  type PersonChanges = { name?: string; bio?: string | null; birthDate?: string | null; deathDate?: string | null };

  const dispatch = createEventDispatcher();
  let editMode: boolean = false;
  let editPerson: PersonEdit;
  let shortenedBio: string | undefined = undefined;
  let bioIsLong: boolean = false;
  let showFullBio: boolean = false;
  let frm: HTMLFormElement | undefined = undefined;
  let unsavedEdits = { fields: [] as string[], timer: undefined as NodeJS.Timeout | undefined };

  function toggleEditMode() {
    editMode = !editMode;
  }

  function actionCancel() {
    editMode = false;
  }
  const submitUpdate: SubmitFunction = ({ formData, cancel }) => {
    const ch = getPersonChanges(person, editPerson);
    if (ch.name?.trim() === '') {
      // name is too short
      return cancel();
    }
    const updatePerson: UpdatablePerson = { id: person.id, ...ch };
    formData.append('person-update', JSON.stringify(updatePerson));
    editMode = false;
  };

  export function reset(newPerson?: Person) {
    editMode = false;
    const p = newPerson ?? person;
    editPerson = toPersonEdit(p);
    const [sb, lb] = truncateString(p.bio ?? '', bioMaxLength, bioMaxLines);
    shortenedBio = lb ? sb.trimEnd() + '…' : undefined;
    bioIsLong = lb;
    showFullBio = false;
  }
  export function tryClose(): boolean {
    if (!editMode) {
      return true;
    }
    const uc = [...Object.keys(getPersonChanges(person, editPerson))];
    if (uc.length < 1) {
      return true;
    }
    if (unsavedEdits.timer !== undefined) {
      clearTimeout(unsavedEdits.timer);
    }
    unsavedEdits.fields = uc;
    unsavedEdits.timer = setTimeout(() => {
      unsavedEdits.fields = [];
    }, 2000);
    return false;
  }

  function close() {
    dispatch('close');
  }
  reset();
</script>

<svelte:window
  on:keydown={e => {
    if (e.key === 'Escape' && tryClose()) {
      close();
    }
  }}
/>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="pop-up" {style} on:click>
  <form method="POST" action="?/updatePerson" enctype="multipart/form-data" use:enhance={submitUpdate} bind:this={frm}>
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
          class:edited={unsavedEdits.fields.includes('name')}
          contenteditable="plaintext-only"
          bind:textContent={editPerson.name}
          use:nonewlines
          on:returnkey={() => frm?.requestSubmit()}
        />
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
            <input
              type="date"
              class="date-input"
              class:edited={unsavedEdits.fields.includes('birthDate')}
              bind:value={editPerson.birthDate}
            />
            <input
              type="date"
              class="date-input"
              class:edited={unsavedEdits.fields.includes('deathDate')}
              bind:value={editPerson.deathDate}
            />
          </div>
        {:else}
          <h3 class="date-display" transition:slide={{ duration: 200, axis: 'y' }}>
            {formatDate(person.birthDate, 'birth')} - {formatDate(person.deathDate, 'death')}
          </h3>
        {/if}
      </div>
      {#if editMode}
        <p
          class="bio"
          class:edited={unsavedEdits.fields.includes('bio')}
          contenteditable="plaintext-only"
          bind:textContent={editPerson.bio}
        />
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
  @use '$lib/styles/common';

  @mixin border-edited-highlight {
    transition: border-color 0.2s;
    &.edited {
      border-color: red;
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

    .personName {
      margin: 9px 2px 0;
      font-size: 2em;
      @include common.contenteditable-border;
      @include border-edited-highlight;
      a {
        @include common.link;
      }
    }
    .top-button {
      @include common.styleless-button;
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
      .date-input {
        @include border-edited-highlight;
      }
    }
    .bio {
      overflow-wrap: anywhere;
      white-space: pre-line;
      text-align: center;
      margin: 0;
      @include common.contenteditable-border;
      @include border-edited-highlight;
    }
    .button-show-more {
      @include common.styleless-button;
      @include common.link-colors;
    }
    .form-buttons {
      margin-top: 12px;
    }
  }
</style>
