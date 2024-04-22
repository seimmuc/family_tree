<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/stores';
  import TimedMessage from '$lib/components/TimedMessage.svelte';
  import { createUrl, validateUsernameAndPassword } from '$lib/utils.js';
  import { slide } from 'svelte/transition';
  import type { SubmitFunction } from './$types.js';
  import { TRANS_DELAY } from '$lib/client/clutils.js';
  import { LANGUAGES } from '$lib/types.js';

  export let data;

  let errComp: TimedMessage;
  const submit: SubmitFunction = ({ formData, cancel }) => {
    const valRes = validateUsernameAndPassword(formData);
    if (valRes.isErr()) {
      errComp.setMessage(valRes.error);
      cancel();
      return;
    }
    return async ({ result, update }) => {
      if (result.type === 'failure' && result.data?.message) {
        errComp.setMessage(result.data.message);
      }
      update();
    };
  };
</script>

<h1 class="head">Register</h1>
<div class="main">
  <form method="POST" use:enhance={submit}>
    {#if data.redirectTo}
      <input type="hidden" name="redir" value={data.redirectTo} />
    {/if}
    <label>
      <span class="lbl">Username</span>
      <input name="username" type="text" autocomplete="username" required />
    </label>
    <label>
      <span class="lbl">Password</span>
      <input name="password" type="password" autocomplete="current-password" required />
    </label>
    <label>
      <span class="lbl">Language</span>
      <select name="language">
        {#each LANGUAGES as l}
          <option value={l.code} selected={l.code === 'en'}>{l.name}</option>
        {/each}
      </select>
    </label>
    <TimedMessage bind:this={errComp} let:msg>
      <span class="error" transition:slide={{ duration: TRANS_DELAY, axis: 'y' }}>{msg}</span>
    </TimedMessage>
    <button class="btn" type="submit">Register</button>
    <span class="info">
      Already have an account?
      <a href={createUrl('/account/login', $page.url, $page.url.searchParams).toString()}>Sign In</a>
    </span>
  </form>
</div>

<style lang="scss">
  @use '$lib/styles/common';
  @use '$lib/styles/colors';

  .head {
    margin-top: 0;
    @include colors.col-trans($bg: false, $fg: true, $br: false);
  }
  .main {
    display: grid;
    grid-template-columns: 0fr 1fr;
    margin: 0;
    column-gap: 1.25em;
    row-gap: 0.75em;
    > form {
      display: contents;
    }
    label {
      display: contents;
      > .lbl {
        grid-column: 1;
        @include colors.col-trans($bg: false, $fg: true, $br: false);
      }
      > input {
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
    .error,
    .btn,
    .info {
      grid-column: 1 / span 2;
    }
    .error {
      color: red;
    }
    .btn {
      width: max-content;
    }
    .info {
      @include colors.col-trans($bg: false, $fg: true, $br: false);
    }
  }
  a {
    @include common.link;
  }
</style>
