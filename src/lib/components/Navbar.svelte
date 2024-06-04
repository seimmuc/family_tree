<script lang="ts">
  import { FontAwesomeIcon } from "@fortawesome/svelte-fontawesome";
import SearchBox, { type SearchBoxLinkFunc } from "./SearchBox.svelte";
  import { faPlus } from "@fortawesome/free-solid-svg-icons";

  export let enableSearchBox = false;
  export let searchBoxLinkFunc: SearchBoxLinkFunc = undefined;
</script>

<div class="root">
  <a class="new-person" href="/details/new"><FontAwesomeIcon icon={faPlus} /></a>
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
  .new-person {
    @include common.link;
    user-select: none;
    font-size: 1.5em;
  }
</style>
