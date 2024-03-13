<script context="module" lang="ts">
  import { PUBLIC_MEDIA_IMAGE_MIME_TYPES } from '$env/static/public';
  import {
    faArrowLeft,
    faArrowUpFromBracket,
    faXmark,
    faTrash,
    faRotateLeft,
    faDeleteLeft,
    faTrashCanArrowUp,
    faFileArrowUp,
    faAngleUp,
    faEraser
  } from '@fortawesome/free-solid-svg-icons';
  import { quadOut } from 'svelte/easing';

  let ACCEPTABLE_FILETYPES: string | string[];
  try {
    ACCEPTABLE_FILETYPES = JSON.parse(PUBLIC_MEDIA_IMAGE_MIME_TYPES);
    if (typeof ACCEPTABLE_FILETYPES !== 'string' && !Array.isArray(ACCEPTABLE_FILETYPES)) {
      throw new Error();
    }
  } catch {
    // PUBLIC_MEDIA_IMAGE_MIME_TYPES either isn't json, or isn't a valid type
    ACCEPTABLE_FILETYPES = PUBLIC_MEDIA_IMAGE_MIME_TYPES;
  }

  const TRANS_OPT = {
    duration: 400,
    easing: quadOut // cubicOut
  };

  const icons = { upload: faArrowUpFromBracket, clear: faEraser, delete: faTrash };
  // const icons = { upload: faAngleUp, clear: faRotateLeft, delete: faXmark };
  // const icons = { upload: faFileArrowUp, clear: faDeleteLeft, delete: faTrashCanArrowUp };
</script>

<script lang="ts">
  import { filedrop, type FileDropOptions } from 'filedrop-svelte';
  import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
  import { formatDate, nonewlines, toPersonEdit, getPersonChanges } from '$lib/client/clutils.js';
  import type { PersonEdit, PersonChanges } from '$lib/client/clutils.js';
  import type { Person, UpdatablePerson } from '$lib/types.js';
  import { enhance } from '$app/forms';
  import type { SubmitFunction } from '@sveltejs/kit';
  import { fade, slide } from 'svelte/transition';

  // params
  export let data;

  $: updatePerson(data.person);

  // vars
  let person: Person;
  let editPerson: PersonEdit;
  let editMode: boolean = false;
  const image = {
    fileInput: undefined as HTMLInputElement | undefined,
    dragging: false,
    src: undefined as string | undefined,
    pSrc: undefined as string | undefined
  };
  const formMsg = {
    message: undefined as string | undefined,
    messageType: undefined as 'success' | 'error' | undefined,
    messageTimeout: undefined as NodeJS.Timeout | undefined
  };
  let frm: HTMLFormElement | undefined;

  // reactive vars
  $: filedropOptions = {
    disabled: !editMode || image.fileInput === undefined,
    input: image.fileInput,
    clickToUpload: false,
    multiple: false,
    windowDrop: false,
    accept: ACCEPTABLE_FILETYPES
  } as FileDropOptions;
  $: photoSrc = getPhotoSrc(image.src, image.pSrc);

  function updatePerson(p: Person) {
    person = p;
    image.src = p.photo ? `/media/${p.photo}` : undefined;
    image.pSrc = undefined;
    editPerson = toPersonEdit(p);
  }
  function getPhotoSrc(originalSrc?: string, previewSrc?: string | null): string | undefined {
    if (previewSrc) {
      return previewSrc;
    } else if (previewSrc === '') {
      return undefined;
    }
    return originalSrc;
  }

  // html callbacks
  function setEditMode(newVal: boolean) {
    editMode = newVal;
    if (!editMode) {
      clearImage();
      removeFormMessage();
    }
  }
  function toggleEditMode() {
    setEditMode(!editMode);
  }

  function onImageFileDrop(e: CustomEvent<FileDropSelectEvent> & { target: any }) {
    image.dragging = false;
    const imageFile = e.detail.files.accepted[0];
    if (imageFile) {
      if (e.detail.method === 'drop' && image.fileInput) {
        // file was dropped onto the image, we should add it to the fileInput element
        const dt = new DataTransfer();
        dt.items.add(imageFile);
        image.fileInput.files = dt.files;
      }
      const fr = new FileReader();
      fr.readAsDataURL(imageFile);
      fr.onload = () => {
        image.pSrc = typeof fr.result === 'string' ? fr.result : undefined;
      };
    }
  }
  function onImageDragEnter(e: CustomEvent<FileDropDragEvent> & { target: any }) {
    image.dragging = true;
  }
  function onImageDragLeave(e: CustomEvent<FileDropDragEvent> & { target: HTMLElement }) {
    if (e.detail.event.relatedTarget !== e.target && !e.target.contains(e.detail.event.relatedTarget as Node | null)) {
      image.dragging = false;
    }
  }
  function clearImage() {
    if (image.fileInput) {
      image.fileInput.value = '';
    }
    image.pSrc = undefined;
  }
  function deleteImage() {
    clearImage();
    image.pSrc = '';
  }

  const submitUpdate: SubmitFunction = ({ formData, cancel }) => {
    const ch = getPersonChanges(person, editPerson);
    if (ch.name?.trim() === '') {
      return cancel();
    }
    ch.name ??= person.name;
    const updatePerson: UpdatablePerson = { id: person.id, ...(ch as PersonChanges & { name: string }) };
    if (image.pSrc == '') {
      // image was marked for deletion
      updatePerson.photo = null;
    }
    console.log('updatePerson: ', updatePerson);
    formData.append('person-update', JSON.stringify(updatePerson));
    return async ({ result, update }) => {
      removeFormMessage();
      if (result.type === 'failure' && result.data?.message) {
        formMsg.message = result.data.message;
        formMsg.messageType = 'error';
        formMsg.messageTimeout = setTimeout(() => {
          removeFormMessage();
        }, 7000);
      } else if (result.type === 'success') {
        editMode = false;
      }
      update();
    };
  };

  // other functions
  function removeFormMessage() {
    clearTimeout(formMsg.messageTimeout);
    formMsg.message = undefined;
    formMsg.messageType = undefined;
    formMsg.messageTimeout = undefined;
  }

  setEditMode(false);
</script>

<div class="root">
  <div class="main-area">
    <div class="top-controls">
      <a class="btn tree" href="/tree/{person.id}">view tree</a>
      <button class="btn edit" type="button" on:click={toggleEditMode}>toggle edit mode</button>
    </div>

    <form method="POST" action="?/update" enctype="multipart/form-data" use:enhance={submitUpdate} bind:this={frm}>
      <div
        class="image-box"
        class:edit={editMode}
        class:preview={image.pSrc !== undefined}
        class:dragging={image.dragging}
        use:filedrop={filedropOptions}
        on:filedrop={onImageFileDrop}
        on:filedragenter={onImageDragEnter}
        on:filedragleave={onImageDragLeave}
      >
        {#if photoSrc === undefined}
          <div class="photo-small missing">No photo</div>
        {:else}
          <img class="photo-small" src={photoSrc} alt={person.name} />
        {/if}
        {#if editMode}
          <div class="photo-edit" transition:fade={TRANS_OPT}>
            <button
              class="photo-edit-btn upload"
              type="button"
              title="Upload image"
              on:click={() => image.fileInput?.click()}
            >
              <FontAwesomeIcon icon={icons.upload} />
            </button>
            {#if image.pSrc !== undefined}
              <button class="photo-edit-btn clear" type="button" title="Clear" on:click={clearImage}>
                <FontAwesomeIcon icon={icons.clear} />
              </button>
            {/if}
            <button class="photo-edit-btn delete" type="button" title="Delete image" on:click={deleteImage}>
              <FontAwesomeIcon icon={icons.delete} />
            </button>
          </div>
        {/if}
        <input type="file" name="photo" style="display: none;" bind:this={image.fileInput} />
      </div>

      {#if editMode}
        <h1
          class="name"
          contenteditable="plaintext-only"
          bind:textContent={editPerson.name}
          use:nonewlines
          on:returnkey={() => frm?.requestSubmit()}
        />
      {:else}
        <h1 class="name">{person.name}</h1>
      {/if}

      {#if editMode}
        <div class="date" transition:slide={{ axis: 'y', ...TRANS_OPT }}>
          <input type="date" class="date input" bind:value={editPerson.birthDate} />
          <input type="date" class="date input" bind:value={editPerson.deathDate} />
        </div>
      {:else}
        <p class="date display" transition:slide={{ axis: 'y', ...TRANS_OPT }}>
          {formatDate(person.birthDate, 'birth')} - {formatDate(person.deathDate, 'death')}
        </p>
      {/if}

      {#if editMode}
        <p class="bio" contenteditable="plaintext-only" bind:textContent={editPerson.bio} />
      {:else}
        <p class="bio">{person.bio}</p>
      {/if}
      {#if editMode}
        {#if formMsg.message}
          <p class="form-message" transition:slide={{ axis: 'y', duration: 200 }}>{formMsg.message}</p>
        {/if}
        <div class="form-buttons" transition:slide={{ axis: 'y', ...TRANS_OPT }}>
          <button type="submit">Save</button>
          <button type="button" on:click={() => setEditMode(false)}>Cancel</button>
        </div>
      {/if}
    </form>
  </div>
</div>

<a class="back-button" href="/tree/{person.id}">
  <FontAwesomeIcon icon={faArrowLeft} size="3x" />
</a>

<style lang="scss">
  @use '$lib/styles/common';

  $image-scale: 1;
  $edit-anim-duration: 0.4s;

  .root {
    display: flex;
    flex-direction: column;
    margin: 30px 15px;
    align-items: center;
  }

  .main-area {
    width: 94%;
    max-width: 900px;
    display: flex;
    flex-direction: column;
    align-items: center;
    border: 3px solid gray;
    border-radius: 16px;
    background-color: #3c3c3c;
    padding: 10px 20px;
    form {
      display: contents;
    }
    .form-message {
      margin: 1px 0 5px;
      color: red;
    }
  }

  .top-controls {
    align-self: flex-start;

    button {
      @include common.styleless-button;
    }
    .btn {
      text-decoration: none;
      color: inherit;
      border: 2px solid gray;
      border-radius: 5px;
      padding: 2px;
    }
  }

  .image-box {
    border: 3px * $image-scale solid #777;
    border-radius: 12px * $image-scale;
    @include common.flex-center;
    min-width: 180px * $image-scale;
    min-height: 120px * $image-scale;
    overflow: hidden;
    position: relative;
    transition: border-color $edit-anim-duration;
    &.edit {
      border-color: yellowgreen;
      .photo-small.missing {
        transform: translateY(-20px);
      }
    }
    &.dragging {
      border-color: lightblue;
      .photo-small {
        filter: blur(4px);
      }
    }
    &.preview {
      border-color: yellow;
      border-style: dashed;
    }
    .photo-small {
      max-width: 400px * $image-scale;
      max-height: 300px * $image-scale;
      transition:
        filter $edit-anim-duration,
        transform $edit-anim-duration;
    }
    .photo-edit {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      font-size: 26px * $image-scale;
      height: 54px * $image-scale;
      background-color: #a0a0a090;
      display: flex;
      flex-direction: row;
      justify-content: space-around;
      align-items: center;
      .photo-edit-btn {
        @include common.styleless-button;
        @include common.flex-center;
        background-color: #000a;
        width: 48px * $image-scale;
        height: 48px * $image-scale;
        padding: 0;
        border-radius: 50%;
      }
    }
  }

  .name {
    margin: 0.2em 0 0;
    @include common.contenteditable-border;
    transition: border-color $edit-anim-duration; // doesn't actually affect anything because svelte replaces the element
  }

  .date {
    margin: 4px 0 0;
    &.display {
      border: 1px solid transparent;
    }
    &.input {
      border: 1px solid gray;
      border-radius: 2px;
    }
  }

  .bio {
    margin: 1.8em 0 1em;
    overflow-wrap: anywhere;
    white-space: pre-line;
    text-align: center;
    @include common.contenteditable-border;
  }

  .back-button {
    color: black;
    position: absolute;
    top: 50px;
    left: 100px;
  }
</style>
