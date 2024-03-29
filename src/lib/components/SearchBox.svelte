<script context="module" lang="ts">
  type Query = Lowercase<string>;
  type SearchRequestStatus = 'waiting' | 'pending' | 'resolved' | 'error';
  class SearchRequest {
    status: SearchRequestStatus;
    promise: Promise<void>;
    query: Query;
    doneTime: Date | undefined = undefined;
    #resolvePromise: (() => void) | undefined = undefined;
    #isResolved = false;
    results: Result<Person[], { errCode: number | 'network'; errMsg: string }> | undefined;
    constructor(query: Query, status: SearchRequestStatus = 'waiting') {
      this.status = status;
      this.query = query;
      this.promise = new Promise(resolve => {
        this.#resolvePromise = resolve;
      });
    }
    get isDone(): boolean {
      return this.#isResolved;
    }
    markDone(
      newStatus: SearchRequestStatus = 'resolved',
      newResults?: Result<Person[], { errCode: number | 'network'; errMsg: string }>
    ) {
      this.status = newStatus;
      if (newResults) {
        this.results = newResults;
      }
      this.doneTime = new Date();
      this.#isResolved = true;
      if (this.#resolvePromise) {
        this.#resolvePromise();
      }
    }
  }
  type ResultList = {
    query: Query;
    request: SearchRequest;
    filteredResults: Person[] | undefined;
  };
  export type SearchCache = SearchRequest[];
  export type SelectionEventDetail = { person: Person; setVal: (newVal: string) => void };

  const CTTL = PUBLIC_SEARCH_CACHE_TTL ? parseInt(PUBLIC_SEARCH_CACHE_TTL) : 3 * 60 * 1000;
</script>

<script lang="ts">
  import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
  import { faMagnifyingGlass, faSpinner } from '@fortawesome/free-solid-svg-icons';
  import { faCircleXmark } from '@fortawesome/free-regular-svg-icons';
  import { createEventDispatcher, tick } from 'svelte';
  import { fade, slide } from 'svelte/transition';
  import FloatingUiComponent from './FloatingUIComponent.svelte';
  import type { Person, SearchQueryCl } from '$lib/types';
  import { err, ok, type Result } from 'neverthrow';
  import { photoUrl } from '$lib/client/clutils';
  import { arrayFilterInPlace } from '$lib/utils';
  import { PUBLIC_SEARCH_CACHE_TTL } from '$env/static/public';

  export let canHide = true;
  export let startHidden = true;
  export let enableXButton = true;
  export let inputBoxStyle: string | undefined = undefined;
  export let linkFunc = undefined as ((person: Person) => string) | undefined;
  export let searchCache: SearchCache | undefined = undefined;

  const dispatch = createEventDispatcher();
  let boxShown = !canHide || !startHidden;
  let query = '';
  let rootElem: HTMLDivElement;
  let inpElem: HTMLInputElement | undefined;
  let rootWidth: number;

  const resultsBox = {
    comp: undefined as FloatingUiComponent | undefined,
    results: undefined as ResultList | undefined,
    get status(): SearchRequestStatus | undefined {
      return this.results?.request.status;
    }
    // request: undefined as SearchRequest | undefined
  };
  let scheduledReqTimeoutId: NodeJS.Timeout | undefined = undefined;
  const cache: SearchCache = searchCache ?? [];

  export function getInputElement(): HTMLInputElement | undefined {
    return inpElem;
  }

  function onSearchInput(e: Event & { currentTarget: EventTarget & HTMLInputElement }) {
    let qry: Query;
    if (e.type === 'keydown' && (e as Event as KeyboardEvent).key === 'Escape') {
      qry = '';
    } else {
      qry = e.currentTarget.value.trim().toLowerCase() as Lowercase<string>;
    }
    if (qry.length < 2) {
      cancelSearchRequest();
      resultsBox.comp?.control.hide();
      resultsBox.results = undefined;
      return;
    }

    let resultList = searchThroughCache(qry);
    if (resultList === undefined) {
      const rl = (resultList = { query: qry, filteredResults: undefined, request: new SearchRequest(qry, 'waiting') });
      rl.request.promise.then(() => {
        filterFromRequest(rl.request, rl);
      });
      scheduleSearchRequest(rl.request);
    } else {
      cancelSearchRequest();
    }
    resultsBox.results = resultList;
    resultsBox.comp?.control.show();
  }

  function searchThroughCache(query: Query): ResultList | undefined {
    const time = new Date().getTime();
    arrayFilterInPlace(cache, sr => sr.doneTime === undefined || time - sr.doneTime.getTime() < CTTL);
    const request = cache.find(sr => sr.status !== 'error' && query.includes(sr.query));
    if (request === undefined) {
      return undefined;
    }
    const result: ResultList = { query, request, filteredResults: undefined };
    request.promise.then(() => {
      filterFromRequest(request, result);
    });
    return result;
  }
  function filterFromRequest(req: SearchRequest, res: ResultList) {
    if (res !== resultsBox.results) {
      return;
    }
    if (!req.isDone) {
      // this should never happen
      throw new Error('trying to filter through unfinished request');
    }
    res.filteredResults = req.results?.isOk()
      ? req.results.value
          .filter(p => p.name.toLowerCase().includes(res.query))
          .sort((a, b) => {
            const [asw, bsw] = [a.name.toLowerCase().startsWith(res.query), b.name.toLowerCase().startsWith(res.query)];
            if (asw !== bsw) {
              return asw ? -1 : 1;
            }
            return 0;
          })
      : undefined;
    resultsBox.results = res;
  }

  function scheduleSearchRequest(request: SearchRequest, delay = 500) {
    cancelSearchRequest();
    scheduledReqTimeoutId = setTimeout(executeSearchRequest, delay, request);
  }
  function cancelSearchRequest() {
    if (scheduledReqTimeoutId !== undefined) {
      clearTimeout(scheduledReqTimeoutId);
      scheduledReqTimeoutId = undefined;
    }
  }
  async function executeSearchRequest(searchRequest: SearchRequest) {
    if (searchRequest.isDone) {
      // this should never happen
      throw new Error('trying to re-execute finished search request');
    }
    searchRequest.status = 'pending';
    cache.push(searchRequest);
    const qryObj: SearchQueryCl = { nameQuery: searchRequest.query };
    const reqPromise = fetch('/api/search', {
      method: 'POST',
      body: JSON.stringify(qryObj),
      headers: { 'content-type': 'application/json' }
    });
    let responseData: { results: Person[] };
    try {
      const response = await reqPromise;
      if (!response.ok) {
        searchRequest.markDone('error', err({ errCode: response.status, errMsg: response.statusText }));
        return;
      }
      responseData = await response.json();
    } catch (e) {
      searchRequest.markDone('error', err({ errCode: 'network', errMsg: `${e}` }));
      return;
    }
    searchRequest.markDone('resolved', ok(responseData.results));
  }

  async function actionSearchBtn() {
    if (!boxShown) {
      boxShown = true;
      await tick();
      inpElem?.focus();
    } else {
      resultsBox.comp?.control.hide(); // this has to be before boxShown is set
      query = '';
      if (canHide) {
        boxShown = false;
      }
    }
  }

  async function onSelect(person: Person, e: MouseEvent & { currentTarget: EventTarget & HTMLAnchorElement }) {
    let nv = undefined;
    const proceed = dispatch(
      'selection',
      {
        person,
        setVal: (newVal: string) => {
          nv = newVal;
        }
      } as SelectionEventDetail,
      { cancelable: true }
    );
    if (proceed) {
      query = nv ?? '';
      resultsBox.comp?.control.hide();
    } else {
      e.preventDefault();
      if (nv) {
        query = nv;
      }
    }
  }

  function onWindowClick(e: MouseEvent & { currentTarget: EventTarget & Window }) {
    if (!resultsBox.comp?.control.isVisible()) {
      return;
    }
    if (!(e.target instanceof Node && rootElem.contains(e.target))) {
      resultsBox.comp.control.hide();
    }
  }

  function highlightMatch(text: string, match: Query): [string, boolean][] {
    const textLC = text.toLowerCase();
    const result: [string, boolean][] = [];
    let i = 0,
      ms = -1;
    while (i < text.length && (ms = textLC.indexOf(match, i)) >= 0) {
      if (ms > i) {
        result.push([text.substring(i, ms), false]);
      }
      i = ms + match.length;
      result.push([text.substring(ms, i), true]);
    }
    if (i < text.length) {
      result.push([text.substring(i, text.length), false]);
    }
    return result;
  }
</script>

<svelte:window on:click={onWindowClick} />

<div class="root" bind:this={rootElem} bind:clientWidth={rootWidth}>
  {#if boxShown}
    <input
      transition:slide={{ axis: 'x' }}
      type="search"
      class="search-box"
      placeholder="Search by name"
      aria-label="Search people by name"
      spellcheck="false"
      style={inputBoxStyle}
      bind:this={inpElem}
      bind:value={query}
      on:input={onSearchInput}
      on:keydown={e => {
        if (e.key === 'Escape') {
          onSearchInput(e);
        }
      }}
    />
    <FloatingUiComponent
      bind:this={resultsBox.comp}
      virtualElement={rootElem}
      placementDir="bottom"
      style="z-index: 1;"
    >
      <ul slot="tooltip" class="results" style:min-width={`${rootWidth}px`}>
        {#if resultsBox.results === undefined || resultsBox.status === 'waiting' || resultsBox.status === 'pending'}
          <div class="single loading"><FontAwesomeIcon icon={faSpinner} pulse={true} /></div>
        {:else if resultsBox.results.request.results?.isErr()}
          <div class="single error">{resultsBox.results.request.results.error.errMsg}</div>
        {:else if resultsBox.results.filteredResults !== undefined}
          {#if resultsBox.results.filteredResults.length < 1}
            <li class="single empty">No results</li>
          {:else}
            {#each resultsBox.results.filteredResults as person (person.id)}
              <li class="person">
                <a href={linkFunc === undefined ? '#' : linkFunc(person)} on:click={e => onSelect(person, e)}>
                  <span class="name">
                    {#each highlightMatch(person.name, resultsBox.results.query) as [fragment, hl]}
                      <span class:hl>{fragment}</span>
                    {/each}
                  </span>
                  {#if person.photo}
                    <img class="photo" src={photoUrl(person)} alt={person.name} />
                  {/if}
                </a>
              </li>
            {/each}
          {/if}
        {:else}
          <div class="single error">Something went wrong</div>
        {/if}
      </ul>
    </FloatingUiComponent>
  {/if}

  {#if !boxShown || (enableXButton && (canHide || query.length > 0))}
    <button transition:fade type="button" class="search-btn" on:click={actionSearchBtn}>
      {#if boxShown}
        <FontAwesomeIcon icon={faCircleXmark} />
      {:else}
        <FontAwesomeIcon icon={faMagnifyingGlass} />
      {/if}
    </button>
  {/if}
</div>

<style lang="scss">
  @use '$lib/styles/common';

  .root {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    justify-content: center;
    align-items: center;
    font-size: 1.4em;
    height: 1.45em;
  }
  .results {
    background-color: var(--col-bg);
    border: 3px solid gray;
    border-radius: 8px;
    box-sizing: border-box;
    list-style: none;
    margin: 0;
    padding: 4px;
    .single {
      min-height: 1em;
      &.error {
        color: red;
      }
      &.empty {
        margin: 4px;
      }
      &.loading {
        text-align: center;
      }
    }
    .person {
      font-size: 1.35em;
      &:not(:last-of-type) {
        border-bottom: 2px solid gray;
      }
      a {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        justify-content: space-between;
        align-items: center;
        @include common.link;
        padding: 0 4px;
        margin: 0;
        .name {
          margin: 4px 0;
          .hl {
            background-color: darkorange;
          }
        }
        .photo {
          max-height: 1.35em;
          max-width: 2.5em;
          margin-right: 0px;
        }
      }
    }
  }
  .search-box {
    width: 15em;
    transition: width 0.4s;
    border: 2px solid gray;
    border-radius: 5px;
    color: inherit;
    background-color: #88888830;
    font-size: inherit;
    &:focus {
      outline-color: rgb(127, 199, 68);
      border-color: rgb(127, 199, 68);
    }
    &::-webkit-search-cancel-button {
      background-color: red;
      color: green;
    }
  }

  .search-btn {
    @include common.styleless-button;
    padding: 3px;
    margin: 0 3px;
  }
</style>
