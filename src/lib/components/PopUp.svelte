<script lang="ts">
  import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
  import { faXmark } from '@fortawesome/free-solid-svg-icons';
  import { faPenToSquare } from '@fortawesome/free-regular-svg-icons';
  import type { Person, UpdatablePerson } from '$lib/types';
  import { createEventDispatcher } from 'svelte';
  import { enhance } from '$app/forms';
  import type { SubmitFunction } from '@sveltejs/kit';
  import { slide } from 'svelte/transition';
  import { truncateString, TRANS_DELAY } from '$lib/client/clutils';
  import PersonInfo from './PersonInfo.svelte';
  import { quadOut } from 'svelte/easing';

  const TRANS_OPT = { duration: TRANS_DELAY, easing: quadOut };

  export let person: Person;
  export let style: string = '';

  const bioMaxLength = 50;
  const bioMaxLines = 4;

  const dispatch = createEventDispatcher();
  let editMode: boolean = false;
  let shortenedBio: string | undefined = undefined;
  let bioIsLong: boolean = false;
  let showFullBio: boolean = false;
  let canSubmit: boolean = true;
  let frm: HTMLFormElement | undefined = undefined;
  let piComp: PersonInfo;
  let unsavedEdits = { fields: [] as string[], timer: undefined as NodeJS.Timeout | undefined };

  function toggleEditMode() {
    editMode = !editMode;
  }

  function actionCancel() {
    editMode = false;
  }
  const submitUpdate: SubmitFunction = ({ formData, cancel }) => {
    const ch = piComp.getChanges();
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
    piComp?.reset(newPerson);
    const [sb, lb] = truncateString(p.bio ?? '', bioMaxLength, bioMaxLines);
    shortenedBio = lb ? sb.trimEnd() + '…' : undefined;
    bioIsLong = lb;
    showFullBio = false;
    canSubmit = true;
  }
  export function tryClose(): boolean {
    if (!editMode) {
      return true;
    }
    const uc = [...Object.keys(piComp.getChanges())];
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
    <PersonInfo
      {editMode}
      {person}
      bioDisplay={!bioIsLong || showFullBio ? undefined : shortenedBio}
      nameLink="/details/{person.id}"
      transOptions={TRANS_OPT}
      on:returnkey={() => frm?.requestSubmit()}
      on:edit={e => (canSubmit = e.detail.edit.name.trim().length > 0)}
      bind:this={piComp}
    >
      <button slot="name-left" class="top-button" type="button" on:click={toggleEditMode}>
        <FontAwesomeIcon icon={faPenToSquare} />
      </button>
      <button slot="name-right" class="top-button" type="button" on:click={close}>
        <FontAwesomeIcon icon={faXmark} />
      </button>
    </PersonInfo>
    <!-- <FontAwesomeIcon icon={faFloppyDisk} /> -->
    {#if !editMode && bioIsLong}
      <button
        type="button"
        class="button-show-more"
        transition:slide={{ ...TRANS_OPT, axis: 'y' }}
        on:click={() => (showFullBio = !showFullBio)}>{showFullBio ? 'Show less' : 'Show more'}</button
      >
    {/if}
    {#if editMode}
      <div class="form-buttons" transition:slide={{ ...TRANS_OPT, axis: 'y' }}>
        <button type="submit" disabled={!canSubmit}>Save</button>
        <button type="button" on:click={actionCancel}>Cancel</button>
      </div>
    {/if}
  </form>
</div>

<style lang="scss">
  @use '$lib/styles/common';
  @use '$lib/styles/colors';

  @mixin border-edited-highlight {
    &.edited {
      border-color: red;
    }
  }

  .pop-up {
    max-width: 600px;
    display: flex;
    flex-direction: column;
    flex-wrap: nowrap;
    align-items: center;
    padding-bottom: 20px;
    --pi-name-margin-bottom: 4px;
    --pi-date-margin: 15px 10px;
    --pi-date-font-size: 1.1em;
    --pi-bio-margin: 0 10px;
    form {
      display: contents;
    }
    .top-button {
      @include common.styleless-button;
      @include colors.col-trans($bg: false, $fg: true, $br: false);
      padding: 11px;
      font-size: 1.4em;
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
