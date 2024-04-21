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
    duration: TRANS_DELAY,
    easing: quadOut // cubicOut
  };

  const icons = { upload: faArrowUpFromBracket, clear: faEraser, delete: faTrash };
  // const icons = { upload: faAngleUp, clear: faRotateLeft, delete: faXmark };
  // const icons = { upload: faFileArrowUp, clear: faDeleteLeft, delete: faTrashCanArrowUp };
</script>

<script lang="ts">
  import { filedrop, type FileDropOptions } from 'filedrop-svelte';
  import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
  import { photoUrl, redirUserChange, TRANS_DELAY } from '$lib/client/clutils.js';
  import type { Person, RelativesChangeRequest, UpdatablePerson } from '$lib/types.js';
  import { enhance } from '$app/forms';
  import type { SubmitFunction } from '@sveltejs/kit';
  import { fade, slide } from 'svelte/transition';
  import RelSection from './RelSection.svelte';
  import { peopleToIdArray } from '$lib/utils';
  import SearchBox, { type SearchBoxLinkFunc } from '$lib/components/SearchBox.svelte';
  import PersonInfo from '$lib/components/PersonInfo.svelte';
  import TimedMessage from '$lib/components/TimedMessage.svelte';
  import { page } from '$app/stores';

  // params
  export let data;

  $: updateData(data.person, data.children, data.parents, data.relatives);

  // vars
  let person: Person;
  let parents: Person[];
  let children: Person[];
  let editMode: boolean = false;
  const image = {
    fileInput: undefined as HTMLInputElement | undefined,
    dragging: false,
    src: undefined as string | undefined,
    pSrc: undefined as string | undefined
  };
  let formMsgg: TimedMessage | undefined = undefined;
  const formMsg = {
    message: undefined as string | undefined,
    messageType: undefined as 'success' | 'error' | undefined,
    messageTimeout: undefined as NodeJS.Timeout | undefined
  };
  let frm: HTMLFormElement | undefined;
  const rels = {
    parentsComp: undefined as any as RelSection,
    childrenComp: undefined as any as RelSection
  };
  let piComp: PersonInfo;

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

  function updateData(p: Person, childrenIds: string[], parentIds: string[], otherPeople: Person[]) {
    person = p;
    image.src = photoUrl(p);
    image.pSrc = undefined;
    piComp?.reset(person);
    parents = otherPeople.filter(p => parentIds.includes(p.id));
    children = otherPeople.filter(p => childrenIds.includes(p.id));
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
    if (!newVal || data.canEdit) {
      editMode = newVal;
    }
    if (!editMode) {
      clearImage();
      formMsgg?.hide();
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

  // form submission functions
  function addRelChanges(chReq: RelativesChangeRequest, relType: string, section: RelSection): void {
    const diffs = section.differences();
    if (diffs.added.length > 0 || diffs.removed.length > 0) {
      chReq[relType] = { added: peopleToIdArray(diffs.added), removed: peopleToIdArray(diffs.removed) };
    }
  }
  const submitUpdate: SubmitFunction = ({ formData, cancel }) => {
    if (!data.canEdit) {
      cancel();
      return;
    }
    // person-update
    const ch = piComp.getChanges();
    if (ch.name?.trim() === '') {
      return cancel();
    }
    const updatePerson: UpdatablePerson = { id: person.id, ...ch };
    if (image.pSrc == '') {
      // image was marked for deletion
      updatePerson.photo = null;
    }
    formData.append('person-update', JSON.stringify(updatePerson));

    // relatives-update
    const relsUpd: RelativesChangeRequest = {};
    addRelChanges(relsUpd, 'parents', rels.parentsComp);
    addRelChanges(relsUpd, 'children', rels.childrenComp);
    const sendRelsUpd = Object.keys(relsUpd).length > 0;
    if (sendRelsUpd) {
      formData.append('relatives-update', JSON.stringify(relsUpd));
    }

    // photo form data is added directly by the browser
    const ph = formData.get('photo');

    // check if there are any changes
    if (
      Object.keys(ch).length < 1 &&
      updatePerson.photo !== null &&
      !sendRelsUpd &&
      !(ph instanceof File && ph.size > 0)
    ) {
      cancel(); // empty update
    }

    // handle errors/success returned by the server
    return async ({ result, update }) => {
      formMsgg?.hide();
      if (result.type === 'failure' && result.data?.message) {
        formMsgg?.setMessage(result.data.message);
      } else if (result.type === 'success') {
        setEditMode(false);
      }
      update();
    };
  };

  // login on user change
  function authChange(user: typeof data.user) {
    redirUserChange(user, 'view', $page.url);
  }
  $: authChange(data.user);

  setEditMode(false);
  data.dynamicMenu.set({
    comp: SearchBox,
    compProps: { linkFunc: (p => `/details/${p.id}`) satisfies SearchBoxLinkFunc }
  });
</script>

<div class="root">
  <div class="main-area">
    <div class="top-controls">
      <a class="btn tree" href="/tree/{person.id}">view tree</a>
      {#if data.canEdit || editMode}
        <button class="btn edit" type="button" on:click={toggleEditMode}>toggle edit mode</button>
      {/if}
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

      <PersonInfo
        {editMode}
        {person}
        transOptions={TRANS_OPT}
        on:returnkey={() => frm?.requestSubmit()}
        bind:this={piComp}
      />

      <div class="relations">
        <RelSection {editMode} sectionName="Parents" people={parents} bind:this={rels.parentsComp} />
        <RelSection {editMode} sectionName="Children" people={children} bind:this={rels.childrenComp} />
      </div>

      {#if editMode && data.canEdit}
        <TimedMessage bind:this={formMsgg} let:msg>
          <p class="form-message" transition:slide={{ axis: 'y', ...TRANS_OPT }}>{msg}</p>
        </TimedMessage>
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
  @use '$lib/styles/colors';

  $image-scale: 1;
  $edit-anim-duration: colors.$fade-time;

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
    background-color: var(--col-primary-bg, colors.$light-primary-bg);
    border: 3px solid var(--col-primary-border, colors.$light-primary-border);
    border-radius: 16px;
    @include colors.col-trans($bg: true, $fg: false, $br: true);
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
    border: 3px * $image-scale solid var(--col-primary-border, colors.$light-primary-border);
    border-radius: 12px * $image-scale;
    @include common.flex-center;
    min-width: 180px * $image-scale;
    min-height: 120px * $image-scale;
    overflow: hidden;
    position: relative;
    @include colors.col-trans($bg: false, $fg: true, $br: true);
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
      background-color: var(--col-details-image-overlay-bg, colors.$light-details-image-overlay-bg);
      @include colors.col-trans($bg: true, $fg: false, $br: false);
      display: flex;
      flex-direction: row;
      justify-content: space-around;
      align-items: center;
      .photo-edit-btn {
        @include common.styleless-button;
        @include common.flex-center;
        background-color: var(--col-details-image-overlay-accent, colors.$light-details-image-overlay-accent);
        color: var(--col-details-image-overlay-fg, colors.$light-details-image-overlay-fg);
        @include colors.col-trans($bg: true, $fg: true, $br: false);
        width: 48px * $image-scale;
        height: 48px * $image-scale;
        padding: 0;
        border-radius: 50%;
      }
    }
  }

  .relations {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    justify-content: space-evenly;
    align-items: flex-start;
    gap: 20px;
    width: 100%;
    margin-top: 15px;
  }

  .back-button {
    color: black;
    position: absolute;
    top: 50px;
    left: 100px;
  }
</style>
