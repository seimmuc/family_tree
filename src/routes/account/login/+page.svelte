<script lang="ts">
  import { enhance } from '$app/forms';
  import { page } from '$app/stores';
  import TimedMessage from '$lib/components/TimedMessage.svelte';
  import { createUrl, validateUsernameAndPassword } from '$lib/utils';
  import { slide } from 'svelte/transition';
  import type { SubmitFunction } from './$types.js';
  import { TRANS_DELAY } from '$lib/client/clutils.js';

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

<h1 class="head">Log in</h1>
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
    <TimedMessage bind:this={errComp} let:msg>
      <span class="error" transition:slide={{ duration: TRANS_DELAY, axis: 'y' }}>{msg}</span>
    </TimedMessage>
    <button class="btn" type="submit">Login</button>
    <span class="info">
      Don't have an account?
      <a href={createUrl('/account/register', $page.url, $page.url.searchParams).toString()}>Sign Up</a>
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
