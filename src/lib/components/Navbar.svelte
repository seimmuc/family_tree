<script lang="ts">
  import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
  import SearchBox, { type SearchBoxLinkFunc } from './SearchBox.svelte';
  import { faHouse, faPlus } from '@fortawesome/free-solid-svg-icons';
  import * as m from '$lib/paraglide/messages.js';

  export let enableHomeButton = true;
  export let enableAddPerson = false;
  export let enableSearchBox = false;
  export let searchBoxLinkFunc: SearchBoxLinkFunc = undefined;
</script>

<div class="root">
  {#if enableHomeButton}
    <a class="nav-btn home" href="/" title={m.menubarNavHome()}><FontAwesomeIcon icon={faHouse} /></a>
  {/if}
  {#if enableAddPerson}
    <a class="nav-btn new-person" href="/details/new" title={m.menubarNavAddPerson()}><FontAwesomeIcon icon={faPlus} /></a>
  {/if}
  {#if enableSearchBox}
    <SearchBox linkFunc={searchBoxLinkFunc} />
  {/if}
</div>

<style lang="scss">
  @use '$lib/styles/common';
  @use '$lib/styles/colors';

  .root {
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
    align-items: center;
    gap: 0.75em;
  }
  .nav-btn {
    @include common.link;
    color: var(--col-fg, colors.$light-text);
    user-select: none;
    font-size: 1.5em;
    padding: 3px;
    margin: 0 3px;
  }
</style>
