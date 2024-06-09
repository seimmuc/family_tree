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
    <a class="home" href="/" title={m.menubarHome()}><FontAwesomeIcon icon={faHouse} /></a>
  {/if}
  {#if enableAddPerson}
    <a class="new-person" href="/details/new" title={m.menubarNavAddPerson()}><FontAwesomeIcon icon={faPlus} /></a>
  {/if}
  {#if enableSearchBox}
    <SearchBox linkFunc={searchBoxLinkFunc} />
  {/if}
</div>

<style lang="scss">
  @use '$lib/styles/common';

  .root {
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
    align-items: center;
    gap: 0.75em;
  }
  .home,
  .new-person {
    @include common.link;
    user-select: none;
    font-size: 1.5em;
  }
</style>
