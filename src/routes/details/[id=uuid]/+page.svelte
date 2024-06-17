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
    faEraser,
    faTrashCan,
    faSpinner,
    faNetworkWired,
    faChevronLeft,
    faPenToSquare
  } from '@fortawesome/free-solid-svg-icons';
  import { quadOut } from 'svelte/easing';

  let ACCEPTABLE_FILETYPES: string[] = parseConfigList(PUBLIC_MEDIA_IMAGE_MIME_TYPES);

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
  import { escapeHtml, portraitUrl, redirUserChange, TRANS_DELAY } from '$lib/client/clutils.js';
  import type { Person, UpdatablePerson } from '$lib/types/person';
  import { enhance } from '$app/forms';
  import type { SubmitFunction } from '@sveltejs/kit';
  import { fade, slide } from 'svelte/transition';
  import RelSection from '../RelSection.svelte';
  import RootDivCentered from '$lib/components/RootDivCentered.svelte';
  import { createRelChangeRequest } from '../utils';
  import { parseConfigList } from '$lib/utils';
  import { type SearchBoxLinkFunc } from '$lib/components/SearchBox.svelte';
  import PersonInfo from '$lib/components/PersonInfo.svelte';
  import TimedMessage from '$lib/components/TimedMessage.svelte';
  import { page } from '$app/stores';
  import FloatingUiComponent, { type FloatingUICompControl } from '$lib/components/FloatingUIComponent.svelte';
  import * as m from '$lib/paraglide/messages.js';
  import Navbar from '$lib/components/Navbar.svelte';
  import { browser } from '$app/environment';

  // params
  export let data;

  $: updateData(data.person, data.children, data.parents, data.partners, data.relatives);

  // vars
  let person: Person;
  let parents: Person[];
  let children: Person[];
  let partners: Person[];
  let editMode: boolean = false;
  const image = {
    fileInput: undefined as HTMLInputElement | undefined,
    dragging: false,
    src: undefined as string | undefined,
    pSrc: undefined as string | undefined
  };
  let formMsg: TimedMessage | undefined = undefined;
  let frm: HTMLFormElement | undefined;
  const rels = {
    parentsComp: undefined as any as RelSection,
    childrenComp: undefined as any as RelSection,
    partnersComp: undefined as any as RelSection
  };
  let piComp: PersonInfo;
  const del = {
    button: undefined as HTMLButtonElement | undefined,
    tooltipRoot: undefined as HTMLDivElement | undefined,
    tooltipControl: undefined as FloatingUICompControl | undefined,
    errMsg: undefined as TimedMessage | undefined,
    processing: false
  };

  // reactive vars
  $: filedropOptions = {
    disabled: !editMode || image.fileInput === undefined,
    input: image.fileInput,
    clickToUpload: false,
    multiple: false,
    windowDrop: false,
    accept: ACCEPTABLE_FILETYPES
  } as FileDropOptions;
  $: portraitSrc = getPortraitSrc(image.src, image.pSrc);

  function updateData(p: Person, childIds: string[], parentIds: string[], partnerIds: string[], relatives: Person[]) {
    person = p;
    image.src = portraitUrl(p);
    image.pSrc = undefined;
    piComp?.reset(person);
    parents = relatives.filter(p => parentIds.includes(p.id));
    children = relatives.filter(p => childIds.includes(p.id));
    partners = relatives.filter(p => partnerIds.includes(p.id));
  }
  function getPortraitSrc(originalSrc?: string, previewSrc?: string | null): string | undefined {
    if (previewSrc) {
      return previewSrc;
    } else if (previewSrc === '') {
      return undefined;
    }
    return originalSrc;
  }
  function getPrevPage(): NavigationHistoryEntry | undefined {
    if (!browser) {
      return undefined;
    } else if (Object.hasOwn(window, 'navigation')) {
      // home: /^\/$/, tree: /^\/tree\/[A-Za-z0-9-]{36}$/, details: /^\/details\/[A-Za-z0-9-]{36}$/, new: /^\/details\/new$/
      const acceptablePatterns = [/^\/$/, /^\/tree\/[A-Za-z0-9-]{36}$/, /^\/details\/[A-Za-z0-9-]{36}$/];
      const entries = window.navigation.entries();
      for (let i = (window.navigation.currentEntry?.index ?? 0) - 1; i < entries.length; i--) {
        const e = entries[i];
        if (e.url !== null) {
          const urlPath = new URL(e.url).pathname;
          if (acceptablePatterns.some(r => r.test(urlPath))) {
            return e;
          }
        }
      }
      return undefined;
    }
  }
  const prevPage: NavigationHistoryEntry | undefined = getPrevPage();

  // html callbacks 
  function goBack() {
    if (Object.hasOwn(window, 'navigation')) {
      const pp = getPrevPage();
      if (pp) {
        console.log(pp.key);
        window.navigation.traverseTo(pp.key);
      }
    } else {
      history.back();
    }
  }
  function setEditMode(newVal: boolean) {
    if (!newVal || data.canEdit) {
      editMode = newVal;
    }
    if (!editMode) {
      clearImage();
      formMsg?.hide();
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
  const submitUpdate: SubmitFunction = ({ formData, cancel }) => {
    if (!data.canEdit) {
      cancel();
      return;
    }
    // person-update
    const chRes = piComp.getChanges();
    if (chRes.isErr()) {
      formMsg?.setMessage(chRes.error);
      return cancel();
    }
    const updatePerson: UpdatablePerson = { id: person.id, ...chRes.value };
    if (image.pSrc === '') {
      // image was marked for deletion
      updatePerson.portrait = null;
    }
    formData.append('person-update', JSON.stringify(updatePerson));

    // relatives-update
    const relsUpd = createRelChangeRequest([
      ['parents', rels.parentsComp],
      ['children', rels.childrenComp],
      ['partners', rels.partnersComp]
    ]);
    const sendRelsUpd = Object.keys(relsUpd).length > 0;
    if (sendRelsUpd) {
      formData.append('relatives-update', JSON.stringify(relsUpd));
    }

    // portrait form data is added directly by the browser
    const ph = formData.get('portrait');

    // check if there are any changes
    if (
      Object.keys(chRes.value).length < 1 &&
      updatePerson.portrait !== null &&
      !sendRelsUpd &&
      !(ph instanceof File && ph.size > 0)
    ) {
      formMsg?.setMessage('nothing to update');
      cancel(); // empty update
    }

    // handle errors/success returned by the server
    return async ({ result, update }) => {
      formMsg?.hide();
      if (result.type === 'failure' && result.data?.message) {
        formMsg?.setMessage(result.data.message);
      } else if (result.type === 'success') {
        setEditMode(false);
      }
      update();
    };
  };
  const submitDelete: SubmitFunction = () => {
    del.processing = true;
    return async ({ result, update }) => {
      del.processing = false;
      if (result.type === 'failure' && result.data?.message) {
        del.errMsg?.setMessage(result.data.message);
      }
      update();
    };
  };

  function onWindowClick(e: MouseEvent & { currentTarget: EventTarget & Window }) {
    if (
      del.tooltipControl?.isVisible() &&
      !(e.target instanceof Node && (del.tooltipRoot?.contains(e.target) || del.button?.contains(e.target)))
    ) {
      del.tooltipControl?.hide();
    }
  }

  // login on user change
  function authChange(user: typeof data.user) {
    redirUserChange(user, 'view', $page.url);
  }
  $: authChange(data.user);

  setEditMode(false);
  data.dynamicMenu.set({
    comp: Navbar,
    compProps: { enableAddPerson: true, enableSearchBox: true, searchBoxLinkFunc: (p => `/details/${p.id}`) satisfies SearchBoxLinkFunc }
  });
</script>

<svelte:window on:click={onWindowClick} />

<RootDivCentered>
  <div class="top-controls">
    <div class="tc-section left">
      {#if prevPage !== undefined}
        <button class="btn back" type="button" transition:slide={{ axis: 'x', ...TRANS_OPT }} on:click={goBack}>
          <FontAwesomeIcon icon={faChevronLeft} />
          {m.detailsBackBtn()}
        </button>
      {/if}
      <a class="btn tree" href="/tree/{person.id}">
        <FontAwesomeIcon icon={faNetworkWired} />
        {m.detailsViewTree()}
      </a>
    </div>
    {#if data.canEdit || editMode}
      <div class="tc-section right">
        <button class="btn edit" type="button" on:click={toggleEditMode}>
          {m.detailsEditMode()}
          <FontAwesomeIcon icon={faPenToSquare} />
        </button>
        {#if data.canEdit && editMode}
          <FloatingUiComponent placementDir="bottom-end" bind:control={del.tooltipControl}>
            <button
              type="button"
              class="btn"
              slot="ref"
              let:floatingRef
              use:floatingRef
              let:control
              on:click={control.toggle}
              bind:this={del.button}
              transition:slide={{ axis: 'x', ...TRANS_OPT }}
            >
              {m.detailsDelete()}
              <FontAwesomeIcon icon={faTrashCan} />
            </button>
            <div slot="tooltip" class="delete-tooltip" bind:this={del.tooltipRoot}>
              <span class="confirm-text">
                {@html m.detailsDeleteConfirm({ name: `<span class="name">${escapeHtml(person.name)}</span>` })}
              </span>
              <form method="POST" action="?/delete" enctype="multipart/form-data" use:enhance={submitDelete}>
                <button type="submit" class="btn">{m.detailsDeleteConfirmButton()}</button>
                {#if del.processing}
                  <FontAwesomeIcon icon={faSpinner} spinPulse />
                {/if}
                <TimedMessage bind:this={del.errMsg} let:msg>
                  <span class="error-text" transition:slide={{ axis: 'y', ...TRANS_OPT }}>{msg}</span>
                </TimedMessage>
              </form>
            </div>
          </FloatingUiComponent>
        {/if}
      </div>
    {/if}
  </div>

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
    {#if portraitSrc === undefined}
      <div class="portrait-small missing">{m.detailsPortraitMissing()}</div>
    {:else}
      <img class="portrait-small" src={portraitSrc} alt={person.name} />
    {/if}
    {#if editMode}
      <div class="portrait-edit" transition:fade={TRANS_OPT}>
        <button
          class="portrait-edit-btn upload"
          type="button"
          title={m.detailsPhotoUpload()}
          on:click={() => image.fileInput?.click()}
        >
          <FontAwesomeIcon icon={icons.upload} />
        </button>
        {#if image.pSrc !== undefined}
          <button class="portrait-edit-btn clear" type="button" title={m.detailsPhotoClear()} on:click={clearImage}>
            <FontAwesomeIcon icon={icons.clear} />
          </button>
        {/if}
        <button class="portrait-edit-btn delete" type="button" title={m.detailsPhotoDelete()} on:click={deleteImage}>
          <FontAwesomeIcon icon={icons.delete} />
        </button>
      </div>
    {/if}
    <input type="file" form="update-form" name="portrait" style="display: none;" bind:this={image.fileInput} />
  </div>

  <PersonInfo
    {editMode}
    {person}
    transOptions={TRANS_OPT}
    on:returnkey={() => frm?.requestSubmit()}
    bind:this={piComp}
  />

  <div class="relations">
    <RelSection {editMode} sectionName={m.sharedRelSectionParents()} people={parents} bind:this={rels.parentsComp} />
    <RelSection {editMode} sectionName={m.sharedRelSectionChildren()} people={children} bind:this={rels.childrenComp} />
    <RelSection {editMode} sectionName={m.sharedRelSectionPartners()} people={partners} bind:this={rels.partnersComp} />
  </div>

  {#if editMode && data.canEdit}
    <TimedMessage bind:this={formMsg} let:msg>
      <p class="form-message" transition:slide={{ axis: 'y', ...TRANS_OPT }}>{msg}</p>
    </TimedMessage>
    <div class="form-buttons" transition:slide={{ axis: 'y', ...TRANS_OPT }}>
      <form
        id="update-form"
        method="POST"
        action="?/update"
        enctype="multipart/form-data"
        use:enhance={submitUpdate}
        bind:this={frm}
      >
        <button type="submit">{m.sharedButtonSave()}</button>
      </form>
      <button type="button" on:click={() => setEditMode(false)}>{m.sharedButtonCancel()}</button>
    </div>
  {/if}
</RootDivCentered>

<style lang="scss">
  @use '$lib/styles/common';
  @use '$lib/styles/colors';

  $image-scale: 1;
  $edit-anim-duration: colors.$fade-time;

  form {
    display: contents;
  }
  .form-message {
    margin: 1px 0 5px;
    color: red;
  }

  .top-controls {
    align-self: flex-start;
    width: 100%;
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    justify-content: space-between;
    align-items: center;

    button {
      @include common.styleless-button;
    }
    .btn {
      font-size: 1.05em;
      text-decoration: none;
      color: inherit;
      border: 2px solid var(--col-secondary-border, colors.$light-secondary-border);
      border-radius: 5px;
      padding: 2px 4px;
      @include colors.col-trans($bg: true, $fg: true, $br: true);
      text-wrap: nowrap;
      :global(svg) {
        font-size: small;
      }
    }

    .delete-tooltip {
      position: relative;
      z-index: 1;
      background-color: var(--col-secondary-bg, colors.$light-secondary-bg);
      border: 2px solid var(--col-secondary-border, colors.$light-secondary-border);
      border-radius: 6px;
      @include colors.col-trans($bg: true, $fg: true, $br: true);
      padding: 0.25em 0.4em;
      display: flex;
      flex-direction: column;
      align-items: center;
      font-size: 1.25rem;
      font-weight: normal;
      .confirm-text {
        display: block;
        :global(.name) {
          font-weight: bold;
        }
      }
      button {
        margin: 0.4em 0 0.2em;
      }
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
      border-color: var(--col-photo-border-edit, colors.$photo-border-color-edit);
      .portrait-small.missing {
        transform: translateY(-20px);
      }
    }
    &.dragging {
      border-color: var(--col-photo-border-drag, colors.$photo-border-color-drag);
      .portrait-small {
        filter: blur(4px);
      }
    }
    &.preview {
      border-color: var(--col-photo-border-preview, colors.$photo-border-color-preview);
      border-style: var(--sty-photo-border-preview, colors.$photo-border-style-preview);
    }
    .portrait-small {
      max-width: 400px * $image-scale;
      max-height: 300px * $image-scale;
      transition: filter $edit-anim-duration;
    }
    .portrait-edit {
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
      .portrait-edit-btn {
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
</style>
