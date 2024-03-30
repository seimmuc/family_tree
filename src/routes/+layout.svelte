<script lang="ts">
  import { browser } from '$app/environment';
  import { navigating } from '$app/stores';
  import { theme } from '$lib/client/stores.js';
  import '$lib/styles/global.scss';
  import type { Theme } from '$lib/types.js';
  import { faGear, faUser, faSun, faMoon } from '@fortawesome/free-solid-svg-icons';
  import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
  import { onMount } from 'svelte';
  
  export let data;

  const dMenu = data.dynamicMenu;

  function setTheme(newTheme: Theme) {
    theme.set(newTheme);
    data.theme = newTheme;
    document.cookie = `theme=${newTheme};max-age=${60*60*24*365};path=/;SameSite=Lax`;
  }
  const toggleTheme = () => setTheme(data.theme === 'dark' ? 'light' : 'dark');

  theme.set(data.theme);
  $: if (browser) {
    document.documentElement.dataset.theme = data.theme;
  }

  onMount(() => {
    const navUnsub = navigating.subscribe(nav => {
      if (nav !== null && nav.from?.route.id !== nav.to?.route.id) {
        dMenu.set({ comp: undefined, compProps: {} });
      }
    });
    return () => {
      navUnsub();
    };
  });
</script>

<div class="menu-bar">
  <div class="menu-section left">
    <svelte:component this={$dMenu.comp} {...$dMenu.compProps} />
  </div>
  <div class="menu-section right">
    <button on:click={toggleTheme}>
      {#if data.theme === 'light'}
        <FontAwesomeIcon icon={faSun} />
      {:else}
        <FontAwesomeIcon icon={faMoon} />
      {/if}
    </button>
    <button><FontAwesomeIcon icon={faGear} /></button>
    <button><FontAwesomeIcon icon={faUser} /></button>
  </div>
</div>
<slot />

<style lang="scss">
  @use '$lib/styles/common';
  @use '$lib/styles/colors';

  :global(body) {
    margin: 0;
  }
  .menu-bar {
    width: 100%;
    box-sizing: border-box;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    padding: 2px 10px 5px;
    margin-bottom: 4px;
    background-color: var(--col-topbar-bg);
    border-bottom: 1px solid var(--col-topbar-border);
    @include colors.col-trans($bg: true, $fg: true, $br: true);
    .menu-section {
      display: flex;
      flex-direction: row;
      flex-wrap: nowrap;
      align-items: center;
    }
    button {
      @include common.styleless-button;
      font-size: 1.5em;
      height: 1.7em;
      aspect-ratio: 1/1;
    }
  }
</style>
