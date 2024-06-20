<script context="module" lang="ts">
  import { tick } from 'svelte';
  import { quadOut } from 'svelte/easing';
  import { fade, scale, slide } from 'svelte/transition';
  import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
  import { faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';
  import { filedrop, type FileDropOptions } from 'filedrop-svelte';
  import type { Photo } from '$lib/types/person';
  import { TRANS_DELAY, photoUrl } from '$lib/client/clutils';
  import * as m from '$lib/paraglide/messages.js';

  const TRANS_OPT = { duration: TRANS_DELAY, easing: quadOut };
  type PhotoEntry = {
    id: string | number;
    imgSource: string | undefined;
    new: boolean;
    deleting: boolean;
    file: File | undefined;
  };
  type PhotoEntryExisting = PhotoEntry & { id: string; photo: Photo; imgSource: string; new: false; file: undefined };
  type PhotoEntryNew = PhotoEntry & { id: number; new: true; deleting: false; file: File };
</script>

<script lang="ts">
  export let photos: Photo[] | undefined;
  export let editMode: boolean = false;
  export let mimetypes: string[];

  let pVis: PhotoEntry[];
  let pEdit: PhotoEntry[];
  let plNextId: number;
  let newFileInput: HTMLInputElement | undefined;
  let newFileDrag: boolean = false;

  $: newFileClass = newFileDrag ? 'dragging' : 'edit';
  $: filedropOptions = {
    disabled: !editMode || newFileInput === undefined,
    input: newFileInput,
    clickToUpload: false,
    multiple: false,
    windowDrop: false,
    accept: mimetypes
  } as FileDropOptions;

  function updatePhotos(phts: typeof photos) {
    pEdit = (phts ?? []).map(photo => {
      return {
        id: photo.id,
        photo,
        imgSource: photoUrl(photo.filename),
        new: false,
        deleting: false,
        file: undefined
      } satisfies PhotoEntryExisting;
    });
    updateEditMode(editMode);
  }
  $: updatePhotos(photos);

  function updateEditMode(eMode: boolean) {
    if (eMode) {
      pVis = pEdit;
    } else {
      pVis = pEdit.filter(p => !p.new);
    }
    tick().then(() => {
      pVis = pVis;
    });
  }
  $: updateEditMode(editMode);

  function addNewPhoto(file: File) {
    const photoEntry: PhotoEntryNew = { id: plNextId++, imgSource: undefined, new: true, deleting: false, file };
    pEdit = [...pEdit, photoEntry];
    const fr = new FileReader();
    fr.readAsDataURL(file);
    fr.onload = () => {
      if (typeof fr.result === 'string') {
        photoEntry.imgSource = fr.result;
        pVis = pVis; // force an update
      }
    };
    updateEditMode(editMode);
  }
  function deletePhoto(id: string | number) {
    const photoEntry: PhotoEntry | undefined = pEdit.find(p => p.id === id);
    if (photoEntry === undefined) {
      return;
    }
    if (photoEntry.new) {
      pEdit = pEdit.filter(p => p.id !== id);
      updateEditMode(editMode);
    } else {
      photoEntry.deleting = !photoEntry.deleting;
      pVis = pVis;
    }
  }

  export function getChanges(): { new: File[]; delete: Photo['id'][] } {
    const result: { new: File[]; delete: Photo['id'][] } = { new: [], delete: [] };
    for (const photo of pEdit) {
      if (photo.new) {
        result.new.push((photo as PhotoEntryNew).file);
      } else if (photo.deleting) {
        result.delete.push((photo as PhotoEntryExisting).photo.id);
      }
    }
    return result;
  }

  function onImageFileDrop(e: CustomEvent<FileDropSelectEvent> & { target: any }) {
    newFileDrag = false;
    const imageFile = e.detail.files.accepted[0];
    if (imageFile) {
      // if (e.detail.method === 'drop' && newFileInput) {}
      addNewPhoto(imageFile);
      if (newFileInput && (newFileInput.files?.length ?? 0 > 0)) {
        newFileInput.files = new DataTransfer().files;
      }
    }
  }
  function onImageDragEnter(e: CustomEvent<FileDropDragEvent> & { target: any }) {
    newFileDrag = true;
  }
  function onImageDragLeave(e: CustomEvent<FileDropDragEvent> & { target: HTMLElement }) {
    if (e.detail.event.relatedTarget !== e.target && !e.target.contains(e.detail.event.relatedTarget as Node | null)) {
      newFileDrag = false;
    }
  }
</script>

{#if editMode || pVis.length > 0}
  <ul class="photo-list" transition:slide={{ axis: 'y', ...TRANS_OPT }}>
    {#each pVis as photo (photo.id)}
      <li class="photo-thumb" class:preview={photo.new || photo.deleting} transition:scale={TRANS_OPT}>
        <img src={photo.imgSource} />
        {#if editMode}
          <div class="photo-overlay" class:deleting={photo.deleting} transition:fade={TRANS_OPT}>
            <button
              class="del-btn"
              title={photo.deleting ? m.cPhotosListUndelete() : m.cPhotosListDelete()}
              on:click={() => deletePhoto(photo.id)}
            >
              <FontAwesomeIcon icon={faTrash} />
            </button>
          </div>
        {/if}
      </li>
    {/each}
    {#if editMode}
      <li
        class="new-photo-btn {newFileClass}"
        transition:slide={{ axis: 'x', ...TRANS_OPT }}
        use:filedrop={filedropOptions}
        on:filedrop={onImageFileDrop}
        on:filedragenter={onImageDragEnter}
        on:filedragleave={onImageDragLeave}
      >
        <button on:click={() => newFileInput?.click()}>
          <span class="icon"><FontAwesomeIcon icon={faPlus} /></span>
          <span>{m.cPhotosListNew()}</span>
        </button>
        <input type="file" style="display: none;" bind:this={newFileInput} />
      </li>
    {/if}
  </ul>
{:else}
  <div class="no-photos" transition:slide={{ axis: 'y', ...TRANS_OPT }}>
    {m.cPhotosListEmpty()}
  </div>
{/if}

<style lang="scss">
  @use '$lib/styles/colors';
  @use '$lib/styles/common';

  $thumb-border-width: 2px;
  $thumb-min-width: 80px;
  $thumb-min-height: 80px;
  $thumb-max-width: 200px;
  $thumb-max-height: 150px;

  ul.photo-list {
    list-style: none;
    padding: 0;
    margin: 0;
    @include common.flex($dir: row, $wrap: wrap, $justifycn: center, $alignco: center);
    gap: 0.2em;
    > li {
      border: $thumb-border-width solid var(--col-primary-border, colors.$light-primary-border);
      border-radius: 8px;
      @include colors.col-trans($bg: false, $fg: true, $br: true);
      overflow: hidden;
      max-width: $thumb-max-width;
      max-height: $thumb-max-height;
      box-sizing: content-box;
      @include common.flex($dir: column, $justifycn: center, $alignit: center);
      &.photo-thumb {
        position: relative;
        @include common.flex($dir: row, $justifycn: center, $alignit: center);
        > img {
          min-width: $thumb-min-width;
          min-height: $thumb-min-height;
          max-width: $thumb-max-width;
          max-height: $thumb-max-height;
          transition: filter colors.$fade-time;
        }
        > .photo-overlay {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
          @include common.flex($dir: column, $justifycn: flex-end);
          > .del-btn {
            height: 33.33%;
            @include common.styleless-button;
            background-color: var(--col-details-image-overlay-accent, colors.$light-details-image-overlay-accent);
            color: var(--col-fg, colors.$light-text);
            @include colors.col-trans(
              $bg: true,
              $fg: true,
              $br: false,
              $extra: (
                height,
                font-size
              )
            );
            &:hover {
              color: color-mix(in srgb, var(--col-fg, colors.$light-text), red 20%);
            }
          }
          &.deleting > .del-btn {
            height: 100%;
            font-size: 1.5em;
            background-color: color-mix(
              in srgb,
              var(--col-details-image-overlay-accent, colors.$light-details-image-overlay-accent),
              orange 5%
            );
            color: color-mix(in srgb, var(--col-fg, colors.$light-text), red 50%);
            &:hover {
              color: color-mix(in srgb, var(--col-fg, colors.$light-text), red 30%);
            }
          }
        }
      }
      &.new-photo-btn > button {
        padding: 0.5em;
        width: 100%;
        height: 100%;
        min-width: $thumb-min-width;
        min-height: $thumb-min-height;
        user-select: none;
        cursor: pointer;
        @include common.styleless-button;
        span {
          display: block;
        }
        &:hover > .icon {
          font-size: 1.3em;
        }
        .icon {
          font-size: 1em;
          color: var(--col-fg, colors.$light-text);
          @include colors.col-trans(
            $bg: false,
            $fg: true,
            $br: true,
            $extra: (
              font-size
            )
          );
          height: 2rem;
          @include common.flex-center;
        }
      }
      &.edit {
        border-color: var(--col-photo-border-edit, colors.$photo-border-color-edit);
      }
      &.preview {
        border-color: var(--col-photo-border-preview, colors.$photo-border-color-preview);
        border-style: var(--sty-photo-border-preview, colors.$photo-border-style-preview);
      }
      &.dragging {
        border-color: var(--col-photo-border-drag, colors.$photo-border-color-drag);
        &.new-photo-btn button .icon {
          font-size: 1.4em;
          font-weight: bold;
          color: var(--col-photo-border-drag, colors.$photo-border-color-drag);
        }
      }
    }
  }
  .no-photos {
    color: var(--col-disabled-fg, colors.$light-text-disabled);
    @include colors.col-trans($bg: false, $fg: true, $br: false);
  }
</style>
