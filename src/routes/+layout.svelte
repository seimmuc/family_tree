<script lang="ts">
  import { browser } from '$app/environment';
  import { goto, invalidate, invalidateAll } from '$app/navigation';
  import { navigating } from '$app/stores';
  import { theme } from '$lib/client/stores.js';
  import FloatingUiComponent from '$lib/components/FloatingUIComponent.svelte';
  import UserMenu from '$lib/components/UserMenu.svelte';
  import '$lib/styles/global.scss';
  import { DEFAULT_USER_OPTIONS, type LangCode } from '$lib/types/user.js';
  import type { Theme } from '$lib/types/other.js';
  import { faGear, faUser, faSun, faMoon } from '@fortawesome/free-solid-svg-icons';
  import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
  import { onMount, setContext } from 'svelte';
  import { config as faconfig } from '@fortawesome/fontawesome-svg-core';
  import '@fortawesome/fontawesome-svg-core/styles.css'; // TODO test impact of this import on initial/subsequent load times
  import { i18n } from '$lib/i18n';

  export let data;

  let language: LangCode;
  function setLanguage(lang: LangCode) {
    if (lang === language) {
      return;
    }
    if (browser && language !== undefined) {
      invalidate('paraglide:lang');
    }
    language = lang;
    i18n.config.runtime.setLanguageTag(lang);
    if (browser) {
      document.documentElement.lang = lang;
      document.documentElement.dir = i18n.config.textDirection[lang] ?? 'ltr';
    }
  }
  setContext('setLanguage', setLanguage);
  setLanguage(data.user?.options.language ?? DEFAULT_USER_OPTIONS.language);

  const dMenu = data.dynamicMenu;

  const userBox = {
    floatComp: undefined as FloatingUiComponent | undefined,
    userComp: undefined as UserMenu | undefined
  };
  let ignoreWinClick = false;

  faconfig.autoAddCss = false;

  function setTheme(newTheme: Theme) {
    theme.set(newTheme);
    data.theme = newTheme;
    document.cookie = `theme=${newTheme};max-age=${60 * 60 * 24 * 365};path=/;SameSite=Lax`;
  }
  const toggleTheme = () => setTheme(data.theme === 'dark' ? 'light' : 'dark');

  theme.set(data.theme);
  $: if (browser) {
    document.documentElement.dataset.theme = data.theme;
  }

  function onUserClick() {
    userBox.floatComp?.control.toggle();
    ignoreWinClick = true;
  }

  function onLogout(e: MouseEvent & { currentTarget: EventTarget & HTMLAnchorElement }) {
    e.preventDefault();
    fetch('/account/logout', { method: 'POST' }).then(res => {
      if (res.ok) {
        invalidate('data:user');
      } else {
        // something went wrong, invalidate everything
        invalidateAll();
      }
      // TODO create and update a user store so that individual pages can choose to reload or redirect on logout
    });
    userBox.floatComp?.control.hide();
  }

  function onWindowClick(e: MouseEvent & { currentTarget: EventTarget & Window }) {
    if (ignoreWinClick || !userBox.floatComp?.control.isVisible()) {
      ignoreWinClick = false;
      return;
    }
    if (!(e.target instanceof Node && userBox.userComp?.getRoot().contains(e.target))) {
      userBox.floatComp.control.hide();
    }
  }

  onMount(() => {
    const navUnsub = navigating.subscribe(nav => {
      if (nav !== null && nav.from?.route.id !== nav.to?.route.id) {
        dMenu.set({ comp: undefined, compProps: {} });
      }
      userBox.floatComp?.control.hide();
    });
    return () => {
      navUnsub();
    };
  });
</script>

<svelte:window on:click={onWindowClick} />

{#key language}
  <div class="menu-bar">
    <div class="menu-section left">
      <svelte:component this={$dMenu.comp} {...$dMenu.compProps} />
    </div>
    <div class="menu-section right">
      <button on:click={toggleTheme}>
        {#if data.theme === 'light'}
          <FontAwesomeIcon icon={faMoon} />
        {:else}
          <FontAwesomeIcon icon={faSun} />
        {/if}
      </button>
      <button
        on:click={() => {
          goto('/account/settings');
        }}><FontAwesomeIcon icon={faGear} /></button
      >
      <FloatingUiComponent enableArrow={false} offsetPx={-6} bind:this={userBox.floatComp}>
        <button slot="ref" type="button" let:floatingRef use:floatingRef on:click={onUserClick}>
          <FontAwesomeIcon icon={faUser} />
        </button>
        <UserMenu slot="tooltip" user={data.user} logoutClickHandler={onLogout} rootStyle="position: relative; z-index: 1;" bind:this={userBox.userComp} />
      </FloatingUiComponent>
    </div>
  </div>
  <slot />
{/key}

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
