<script lang="ts">
  import FloatingUiComponent, { type FloatingUICompControl } from '$lib/components/FloatingUIComponent.svelte';
  import { USER_PERMISSIONS } from '$lib/types.js';
  import type { User, UserID, UserPermChanges, UserPermChangesReq, UserPermission } from '$lib/types.js';
  import { titleCaseWord, validateUsername } from '$lib/utils';
  import {
    faCircleCheck,
    faCircleChevronRight,
    faCircleExclamation,
    faSpinner,
    faTrashCan
  } from '@fortawesome/free-solid-svg-icons';
  import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
  import { fade, slide, type SlideParams } from 'svelte/transition';
  import { page } from '$app/stores';
  import { TRANS_DELAY, redirUserChange } from '$lib/client/clutils.js';

  const TRANS_OPTS: SlideParams = { axis: 'x', duration: TRANS_DELAY };

  export let data;

  let users: User[] = [];
  let userInp: string;
  let selectedUser: User | undefined = undefined;
  let unsavedChanges = false;
  const pOptions: Record<UserPermission, boolean> = { view: false, edit: false, admin: false };
  let requestPending = false;
  const removeOwnAdmin = {
    attempting: false,
    allow: false
  };
  const del = {
    button: undefined as HTMLButtonElement | undefined,
    tooltipRoot: undefined as HTMLDivElement | undefined,
    tooltipControl: undefined as FloatingUICompControl | undefined,
    processing: false,
    error: undefined as [string, NodeJS.Timeout] | undefined
  };
  const show = {
    forceSet: false,
    fetchUser: false,
    saving: false,
    error: undefined as [string, NodeJS.Timeout] | undefined
  };
  const searchReq = {
    prohibit: false,
    promise: undefined as Promise<Response> | undefined,
    queries: [] as string[]
  };

  // login on user change
  function authChange(user: typeof data.user) {
    redirUserChange(user, 'admin', $page.url);
  }
  $: authChange(data.user);

  function addKnownUsers(newu: User[]) {
    newu = newu.filter(u => u !== undefined);
    if (users.length > 0 && newu.length > 0) {
      const nIds = new Set(newu.map(u => u.id));
      users = users.filter(u => !nIds.has(u.id));
    }
    users = users.concat(newu);
  }
  function update(usrs: User[]) {
    addKnownUsers(usrs);
  }
  $: update(data.users);

  function getChanges(o: typeof pOptions, u: User | undefined): UserPermChanges {
    const changes: { perm: UserPermission; change: 'add' | 'del' }[] = [];
    if (u !== undefined) {
      for (const perm of USER_PERMISSIONS) {
        if (o[perm] !== u.permissions.includes(perm)) {
          changes.push({ perm, change: o[perm] ? 'add' : 'del' });
        }
      }
    }
    return changes;
  }

  function setSelectedUser(user: User | undefined, force: boolean): boolean {
    if (!force && unsavedChanges) {
      return false;
    }
    selectedUser = user;
    actionReset();
    permUpd();
    return true;
  }
  function getSearchQuery(uname?: string): string | undefined {
    const qry = (uname ?? userInp ?? '').trim().toLowerCase();
    if (qry.length > 0 && validateUsername(qry).isOk()) {
      return qry;
    }
    return undefined;
  }
  function canSearchFor(uname?: string): boolean {
    const qry = getSearchQuery(uname);
    return qry !== undefined && qry.length <= 32 && !searchReq.queries.includes(qry);
  }

  function onUserInput(force = false) {
    const uinp = userInp.trim().toLowerCase();
    const su = users.find(u => u.username.toLowerCase() === uinp);
    const userChanged = su === selectedUser || setSelectedUser(su, force);
    show.forceSet = !force && !userChanged && su !== undefined;
    const canSearch = su === undefined && data.maxFetched && canSearchFor(uinp);
    show.fetchUser = canSearch;
    if (canSearch && force && searchReq.promise === undefined && !searchReq.prohibit) {
      const query = getSearchQuery(uinp) as string;
      searchReq.queries.push(query);
      show.fetchUser = false;
      const rp = (searchReq.promise = fetch('/api/users/search', {
        method: 'POST',
        body: JSON.stringify({ query }),
        headers: { 'content-type': 'application/json' }
      }));
      rp.then(async res => {
        searchReq.promise = undefined;
        const user: User | undefined = (await res.json()).result;
        if (res.status === 200 && user !== undefined) {
          addKnownUsers([user]);
          onUserInput(false);
        } else if (res.status === 403 || res.status === 400) {
          searchReq.prohibit = true;
        }
      });
    }
  }
  function permUpd() {
    unsavedChanges = getChanges(pOptions, selectedUser).length > 0;
    removeOwnAdmin.attempting =
      selectedUser !== undefined &&
      selectedUser.id === data.user?.id &&
      selectedUser.permissions.includes('admin') &&
      pOptions.admin === false;
  }
  function onWindowClick(e: MouseEvent & { currentTarget: EventTarget & Window }) {
    if (
      del.tooltipControl?.isVisible() &&
      !(e.target instanceof Node && (del.tooltipRoot?.contains(e.target) || del.button?.contains(e.target)))
    ) {
      del.tooltipControl?.hide();
    }
  }

  function actionSave() {
    if (!unsavedChanges || selectedUser === undefined) {
      return;
    }
    show.saving = true;
    const changes = getChanges(pOptions, selectedUser);
    const reqPromise = fetch('/api/users/permissions', {
      method: 'POST',
      body: JSON.stringify({ user: selectedUser.id, changes } satisfies UserPermChangesReq),
      headers: { 'content-type': 'application/json' }
    });
    reqPromise.then(async response => {
      if (response.status === 200) {
        const { result }: { result: User } = await response.json();
        addKnownUsers([result]);
        if (selectedUser?.id === result?.id) {
          setSelectedUser(result, true);
        }
      } else {
        const { error }: { error: string } = await response.json();
        if (show.error) {
          clearTimeout(show.error[1]);
        }
        show.error = [
          error ?? 'server error',
          setTimeout(() => {
            show.error = undefined;
          }, 8_000)
        ];
      }
      show.saving = false;
    });
  }

  function actionReset() {
    if (selectedUser !== undefined) {
      for (const p of USER_PERMISSIONS) {
        pOptions[p] = selectedUser.permissions.includes(p) ?? false;
      }
      permUpd();
      removeOwnAdmin.allow = false;
    }
  }

  function actionDelete() {
    if (selectedUser === undefined) {
      return;
    }
    del.processing = true;
    const userId = selectedUser.id;
    const reqPromise = fetch('/api/users/delete', {
      method: 'POST',
      body: JSON.stringify({ userId } satisfies { userId: UserID }),
      headers: { 'content-type': 'application/json' }
    });
    reqPromise.then(async response => {
      if (response.status === 200) {
        users = users.filter(u => u.id !== userId);
        if (selectedUser?.id === userId) {
          setSelectedUser(undefined, true);
          userInp = '';
        }
        if (userId === data.user?.id) {
          authChange(null);
        }
      } else {
        const { error }: { error: string } = await response.json();
        if (del.error) {
          clearTimeout(del.error[1]);
        }
        del.error = [
          error ?? 'server error',
          setTimeout(() => {
            del.error = undefined;
          }, 8_000)
        ];
      }
      del.processing = false;
    });
  }
</script>

<svelte:window on:click={onWindowClick} />

<h1 class="head">Administration</h1>
<div class="user-select">
  <label
    >User<input
      type="search"
      list="usernames-list"
      maxlength="32"
      bind:value={userInp}
      on:input={() => onUserInput()}
      on:keydown={e => {
        if (e.key === 'Enter') {
          onUserInput(true);
        }
      }}
    /></label
  >
  {#if show.forceSet}
    <button type="button" class="uin-btn" transition:slide={TRANS_OPTS} on:click={() => onUserInput(true)}>
      <FontAwesomeIcon icon={faCircleCheck} />
    </button>
  {:else if show.fetchUser}
    <button
      type="button"
      class="uin-btn"
      transition:slide={TRANS_OPTS}
      on:click={() => onUserInput(true)}
      disabled={requestPending}
    >
      <FontAwesomeIcon icon={faCircleChevronRight} />
    </button>
  {/if}
  {#if data.maxFetched}
    <span class="incomplete-list-warn">
      <FontAwesomeIcon icon={faCircleExclamation} size="sm" />
      <span class="detail">User suggestions list is incomplete</span>
    </span>
  {/if}
</div>
{#if selectedUser}
  <div class="separator" />
  <div class="user-view" transition:slide={{ ...TRANS_OPTS, axis: 'y' }}>
    <h2 class="user-name">
      {selectedUser.username}
      <FloatingUiComponent bind:control={del.tooltipControl}>
        <button
          slot="ref"
          type="button"
          let:floatingRef
          use:floatingRef
          let:control
          on:click={control.toggle}
          bind:this={del.button}
        >
          <FontAwesomeIcon icon={faTrashCan} />
        </button>
        <div slot="tooltip" class="delete-tooltip" bind:this={del.tooltipRoot}>
          <span class="confirm-text">Delete <span class="uname">{selectedUser.username}</span> user?</span>
          <button type="button" on:click={actionDelete}>Confirm</button>
          {#if del.processing}
            <FontAwesomeIcon icon={faSpinner} spinPulse />
          {/if}
          {#if del.error}
            <span class="error-text" transition:fade={{ duration: TRANS_OPTS.duration }}>{del.error[0]}</span>
          {/if}
        </div>
      </FloatingUiComponent>
    </h2>
    <h4 class="user-header">Permissions</h4>
    <ul class="user-permissons">
      {#each USER_PERMISSIONS as perm}
        <li>
          <label>
            <input type="checkbox" bind:checked={pOptions[perm]} on:change={permUpd} />
            {titleCaseWord(perm)}
          </label>
        </li>
      {/each}
    </ul>
    {#if unsavedChanges}
      <div class="change-panel" transition:slide={{ ...TRANS_OPTS, axis: 'y' }}>
        <button type="button" on:click={actionSave} disabled={removeOwnAdmin.attempting && !removeOwnAdmin.allow}>
          Save
        </button>
        <button type="button" on:click={actionReset}>Reset</button>
        {#if removeOwnAdmin.attempting}
          <label transition:fade={{ duration: TRANS_OPTS.duration }}>
            <input type="checkbox" bind:checked={removeOwnAdmin.allow} />
            Yes, I want to remove my own admin permission
          </label>
        {/if}
        {#if show.saving}
          <FontAwesomeIcon icon={faSpinner} spinPulse />
        {/if}
        {#if show.error}
          <span class="error-text" transition:fade={{ duration: TRANS_OPTS.duration }}>{show.error[0]}</span>
        {/if}
      </div>
    {/if}
  </div>
{/if}

<datalist id="usernames-list">
  {#each users as user (user.id)}
    <option value={user.username} />
  {/each}
</datalist>

<style lang="scss">
  @use '$lib/styles/common';
  @use '$lib/styles/colors';

  .head {
    margin-top: 0;
    @include colors.col-trans($bg: false, $fg: true, $br: false);
  }
  .user-select {
    display: flex;
    align-items: center;
    label {
      display: contents;
      color: var(--col-fg, colors.$light-text);
      @include colors.col-trans($bg: false, $fg: true, $br: false);
    }
    input {
      margin-left: 1em;
      margin-right: 0.4em;
      background-color: var(--col-secondary-bg, colors.$light-secondary-bg);
      border: 1px solid var(--col-secondary-border, colors.$light-secondary-border);
      border-radius: 2px;
      color: var(--col-fg, colors.$light-text);
      @include colors.col-trans($bg: true, $fg: true, $br: true);
    }
    .uin-btn {
      @include common.styleless-button;
      padding: 1px;
      margin-right: 5px;
    }
    .incomplete-list-warn {
      color: var(--col-warning-fg, colors.$light-warning-fg);
      @include colors.col-trans($bg: false, $fg: true, $br: false);
      user-select: none;
      display: contents;
      .detail {
        display: none;
        margin-left: 2px;
      }
      &:hover .detail {
        display: inline;
      }
    }
  }
  .separator {
    margin-top: 1em;
    height: 3px;
    width: calc(100% + 2 * var(--account-hpad, 0px));
    margin-left: calc(0px - var(--account-hpad, 0px));
    background-color: var(--col-primary-border, colors.$light-primary-border);
  }
  .user-view {
    margin: 0;
    .user-name {
      margin: 0.5em 0;
      > button {
        @include common.styleless-button;
        font-size: 0.65em;
        color: inherit;
        &:hover {
          color: red;
        }
      }
      .delete-tooltip {
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
          .uname {
            font-weight: bold;
            font-family: monospace;
          }
        }
        button {
          margin: 0.4em 0 0.2em;
        }
      }
    }
    .user-header {
      margin: 0.25em 0;
    }
    .user-permissons {
      list-style: none;
      padding-left: 0.5em;
      margin: 0.35em 0;
    }
    .change-panel {
      margin-top: 0.75em;
      // .uview-btn {}
    }
  }
  .error-text {
    color: red;
  }
</style>