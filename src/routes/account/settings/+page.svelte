<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/stores';
  import { TRANS_DELAY, redirUserChange } from '$lib/client/clutils';
  import TimedMessage from '$lib/components/TimedMessage.svelte';
  import { LANGUAGES, USER_OPTIONS_UPDATE_SCHEMA, DEFAULT_USER_OPTIONS } from '$lib/types/user.js';
  import type { LangCode, User, UserOptions } from '$lib/types/user.js';
  import { toFullUserOptions } from '$lib/utils.js';
  import { slide } from 'svelte/transition';
  import type { SubmitFunction } from './$types.js';
  import { ValidationError } from 'yup';
  import * as m from '$lib/paraglide/messages.js';
  import { getContext } from 'svelte';

  export let data;

  let errMsg: TimedMessage | undefined = undefined;
  let unsavedChanges = false;
  let user: User;
  let options: Required<UserOptions>;
  let editOptions: Required<UserOptions>;

  const setLanguage: (lang: LangCode) => void = getContext('setLanguage');

  function reset(u: User | null) {
    if (u === null) {
      redirUserChange(u, undefined, $page.url);
    } else {
      user = u;
      options = toFullUserOptions(user.options);
      editOptions = structuredClone(options);
      onSettingChange();
    }
  }

  function onSettingChange() {
    unsavedChanges = Object.keys(getChanges()).length > 0;
  }

  function getChanges(): Partial<UserOptions> {
    // TODO as options complexity grows, consider using https://www.npmjs.com/package/fast-json-patch
    // alternatively use https://www.npmjs.com/package/recursive-diff or https://www.npmjs.com/package/deep-object-diff
    type K = keyof UserOptions;
    return Object.fromEntries(Object.entries(editOptions).filter(([k, v]) => options[k as K] !== v));
  }

  const submitUpdate: SubmitFunction = ({ formData, cancel }) => {
    let changes = getChanges();
    if (Object.keys(getChanges()).length <= 0) {
      errMsg?.setMessage('empty update');
      return cancel();
    }
    try {
      changes = USER_OPTIONS_UPDATE_SCHEMA.validateSync(changes);
    } catch (e) {
      if (!(e instanceof ValidationError)) {
        throw e;
      }
      errMsg?.setMessage(e.message);
      return cancel();
    }
    formData.set('settings-update', JSON.stringify(changes));
    return async ({ update, result }) => {
      await update();
      if (result.type === 'failure') {
        errMsg?.setMessage(result.data?.message);
      } else if (result.type === 'success' && result.data?.options) {
        if (data.user) {
          data.user.options = result.data.options;
          if (setLanguage !== undefined) {
            setLanguage(data.user.options.language ?? DEFAULT_USER_OPTIONS.language);
          }
        }
        reset(data.user);
      }
    };
  };

  function actionCancel() {
    reset(user);
  }

  reset(data.user);
</script>

<h1 class="head">{m.settingsTitle()}</h1>
<form method="POST" use:enhance={submitUpdate}>
  <div class="settings">
    <label>
      <span class="lbl">{m.settingsLanguage()}</span>
      <select bind:value={editOptions.language} on:change={onSettingChange}>
        {#each LANGUAGES as l}
          <option value={l.code} selected={l.code === options.language}>{l.name}</option>
        {/each}
      </select>
    </label>
  </div>
  {#if unsavedChanges}
    <div class="actions" transition:slide={{ duration: TRANS_DELAY, axis: 'y' }}>
      <TimedMessage bind:this={errMsg} let:msg>
        <p class="err-msg" transition:slide={{ duration: TRANS_DELAY, axis: 'y' }}>{msg}</p>
      </TimedMessage>
      <button type="submit">{m.settingsSubmit()}</button>
      <button type="button" on:click={actionCancel}>{m.settingsCancel()}</button>
    </div>
  {/if}
</form>

<style lang="scss">
  @use '$lib/styles/common';
  @use '$lib/styles/colors';
  .head {
    margin-top: 0;
  }
  form {
    margin-bottom: 0.8em;
  }
  .settings {
    display: grid;
    grid-template-columns: 0fr 1fr;
    margin: 0;
    column-gap: 1.25em;
    row-gap: 0.75em;
    label {
      display: contents;
      > .lbl {
        grid-column: 1;
        @include colors.col-trans($bg: false, $fg: true, $br: false);
      }
      > select {
        grid-column: 2;
        background-color: var(--col-secondary-bg, colors.$light-secondary-bg);
        border: 1px solid var(--col-secondary-border, colors.$light-secondary-border);
        border-radius: 2px;
        color: var(--col-fg, colors.$light-text);
        @include colors.col-trans($bg: true, $fg: true, $br: true);
      }
      > * {
        align-self: center;
      }
    }
  }
  .actions {
    margin-top: 1em;
    .err-msg {
      color: red;
      margin: 0 0 0.35em;
    }
  }
</style>
