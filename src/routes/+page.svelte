<script lang="ts">
  import { invalidate } from '$app/navigation';
  import { page } from '$app/stores';
  import { formatDate, onStoreValChange } from '$lib/client/clutils';
  import { userStore } from '$lib/client/stores.js';
  import PagedList from '$lib/components/PagedList.svelte';
  import RootDivCentered from '$lib/components/RootDivCentered.svelte';
  import Navbar from '$lib/components/Navbar.svelte';
  import type { SearchBoxLinkFunc } from '$lib/components/SearchBox.svelte';
  import * as m from '$lib/paraglide/messages.js';
  import type { Person } from '$lib/types/person';
  import type { ListPeopleQueryCl } from '$lib/types/reqdata.js';
  import { createUrl } from '$lib/utils.js';
  import { faSpinner } from '@fortawesome/free-solid-svg-icons';
  import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
  import { onMount } from 'svelte';

  export let data;

  const people: Person[] = data.initPeople ?? [];
  let peopleCount = data.peopleCount ?? people.length;
  let pageSize = data.pageSize ?? 50;

  async function fetchPage(startIndex: number, maxItemCount: number): Promise<{ items: Person[]; totalItems: number }> {
    if (startIndex < 0) {
      throw new Error(`startIndex is too low (${startIndex})`);
    } else if (maxItemCount < 1 || maxItemCount > 100) {
      throw new Error(`maxItemCount is out of range (${maxItemCount})`);
    }
    const qryData: ListPeopleQueryCl = { skip: startIndex, limit: maxItemCount };
    const qryObj = Object.fromEntries(Object.entries(qryData).map(([k, v]) => [k, v.toString()]));
    const request = fetch(createUrl('/api/list', $page.url, qryObj), { method: 'GET' });
    const response = await request;
    let responseData: { people: Person[]; totalCount: number } = await response.json();
    return { items: responseData.people, totalItems: responseData.totalCount };
  }

  function personDisplayName(p: Person): string {
    // if (p.birthDate !== undefined || p.deathDate !== undefined) {
    //   return `${p.name} (${formatDate(p.birthDate)} - ${formatDate(p.deathDate)})`;
    // }
    return p.name;
  }
  onMount(() => {
    const userUnsub = onStoreValChange(userStore, () => {
      invalidate('data:personlist');
    });

    return () => {
      userUnsub();
    }
  });

  data.dynamicMenu.set({
    comp: Navbar,
    compProps: { enableHomeButton: false, enableAddPerson: true, enableSearchBox: true, searchBoxLinkFunc: (p => `/tree/${p.id}`) satisfies SearchBoxLinkFunc }
  });
</script>

<svelte:head>
  <title>{m.listTitle()}</title>
</svelte:head>

<RootDivCentered>
  {#if !data.authorized}
    {#if data.signedIn}
      <p class="notice">
        {@html m.listNoPerm({ logoutlink: `<a href="/account/logout">${m.listNoPermLogout()}</a>` })}
      </p>
    {:else}
      <p class="notice">
        {@html m.listNoUser({ loginlink: `<a href="/account/login">${m.listNoUserLogin()}</a>`, reglink: `<a href="/account/register">${m.listNoUserReg()}</a>` })}
      </p>
    {/if}
  {:else}
    <h1>{m.listTitle()}</h1>
    <PagedList pagesData={{ 1: people }} totalItems={peopleCount} {pageSize} fetchItemsFunc={fetchPage}>
      <li slot="item" class="pl-person {index % 2 === 0 ? 'even' : 'odd'}" let:item let:index>
        <a href="/tree/{item.id}">{personDisplayName(item)}</a>
      </li>
      <svelte:fragment slot="empty">
        <li class="pl-empty"><span>{m.listNoPeople()}</span></li>
        <li class="pl-empty"><a href="/details/new">{m.listCreateNew()}</a></li>
      </svelte:fragment>
      <li slot="loading" class="pl-loading"><FontAwesomeIcon icon={faSpinner} pulse={true} /></li>
    </PagedList>
  {/if}
</RootDivCentered>

<style lang="scss">
  @use '$lib/styles/colors';
  @use '$lib/styles/common';

  .notice {
    font-size: 1.2em;
    :global(a) {
      @include common.link;
    }
  }
  h1 {
    margin: 0.25em 0;
    @include colors.col-trans($bg: false, $fg: true, $br: false);
  }
  li.pl-person {
    width: calc(100% - 10px);
    padding: 0 5px;
    &:first-of-type {
      padding-top: 3px;
    }
    &:last-of-type {
      padding-bottom: 3px;
    }
    &.even {
      background-color: color-mix(in srgb, var(--col-secondary-bg, colors.$light-secondary-bg), white 7%);
      @include colors.col-trans($bg: true, $fg: false, $br: false);
    }
    &.odd {
      background-color: color-mix(in srgb, var(--col-secondary-bg, colors.$light-secondary-bg), black 7%);
      @include colors.col-trans($bg: true, $fg: false, $br: false);
    }
  }
  li.pl-person a,
  li.pl-empty a {
    @include common.link;
    user-select: none;
  }
</style>
