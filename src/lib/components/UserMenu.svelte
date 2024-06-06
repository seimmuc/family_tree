<script lang="ts">
  import type { User } from '$lib/types/user';
  import { page } from '$app/stores';
  import { createUrl } from '$lib/utils';
  import * as m from '$lib/paraglide/messages.js';
  import { escapeHtml, userHasPermission } from '$lib/client/clutils';
  type CEv = MouseEvent & { currentTarget: EventTarget & HTMLAnchorElement };

  export let user: User | null;
  export let logoutClickHandler: ((event: CEv) => void) | undefined = undefined;
  export let rootStyle: string | undefined = undefined;

  let root: HTMLUListElement;

  export function getRoot(): HTMLUListElement {
    return root;
  }

  function hrefWithRedir(urlpath: string): string {
    const url = $page.url;
    if (url.pathname === urlpath) {
      return '';
    }
    return createUrl(urlpath, url, { redirectTo: url.pathname }).toString();
  }
  function onLogoutClick(e: CEv) {
    if (logoutClickHandler !== undefined) {
      logoutClickHandler(e);
    }
  }
</script>

<ul style={rootStyle} bind:this={root}>
  <li class="info">
    {#if user === null}
      {m.menubarUserNotSignedIn()}
    {:else}
      {@html m.menubarUserSignedAs({ name: `<span class="username">${escapeHtml(user.username)}</span>`})}
    {/if}
  </li>

  {#if userHasPermission(user, 'admin')}
    <li><a href="/account/admin">{m.menubarUserAdmin()}</a></li>
  {/if}

  {#if user === null}
    <li><a href={hrefWithRedir('/account/login')}>{m.menubarUserSignIn()}</a></li>
    <li><a href={hrefWithRedir('/account/register')}>{m.menubarUserRegister()}</a></li>
  {:else}
    <li><a href={hrefWithRedir('/account/logout')} on:click={onLogoutClick}>{m.menubarUserSignOut()}</a></li>
  {/if}
</ul>

<style lang="scss">
  @use '$lib/styles/common';
  @use '$lib/styles/colors';

  ul {
    list-style: none;
    background-color: var(--col-primary-bg, colors.$light-primary-bg);
    border: 3px solid var(--col-primary-border, colors.$light-primary-border);
    border-radius: 3px;
    padding: 4px 5px;
    > li {
      padding: 1px 2px;
      border-bottom: 0 solid var(--col-primary-border, colors.$light-primary-border);
      &:not(:last-of-type) {
        border-bottom-width: 2px;
      }
      &.info {
        :global(span.username) {
          font-size: 1.2em;
          font-weight: bold;
        }
        padding-bottom: 6px;
      }
    }
    a {
      @include common.link;
    }
  }
</style>
