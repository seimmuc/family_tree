<script lang="ts" generics="T extends any">
  import type { Action } from 'svelte/action';

  import * as m from '$lib/paraglide/messages.js';

  export let initialPageNum: number = 1;
  export let pagesData: Record<number, T[]> = {};
  export let pageSize: number;
  export let totalItems: number;
  export let fetchItemsFunc: (startIndex: number, maxItemCount: number) => Promise<{ items: T[]; totalItems: number }>;

  let curPageNum: number = initialPageNum;
  const page = {
    state: 'empty' as 'list' | 'loading' | 'empty',
    items: [] as T[],
    first: 0,
    last: 0
  };
  let fetchPromise: undefined | ReturnType<typeof fetchItemsFunc> = undefined;

  export function getPageCount(): number {
    return Math.ceil(totalItems / pageSize);
  }
  function updatePageView(items: T[], pageNum: number) {
    page.state = items.length > 0 ? 'list' : 'empty';
    page.items = items;
    page.first = (pageNum - 1) * pageSize + 1;
    page.last = page.first + items.length - 1;
  }
  function updateTotalCount(count: number) {
    totalItems = count;
  }
  export function setPage(pageNum: number) {
    if (pageNum < 1 || (pageNum > 1 && pageNum > getPageCount())) {
      throw new Error(`page number is out of range: [1-${getPageCount()}], requested ${pageNum}`);
    }
    if (fetchPromise !== undefined) {
      return;
    }
    curPageNum = pageNum;
    const cachedPage = pagesData[pageNum];

    if (cachedPage === undefined) {
      page.state = 'loading';
      fetchPromise = fetchItemsFunc((pageNum - 1) * pageSize, pageSize).then(
        res => {
          pagesData[pageNum] = res.items;
          updateTotalCount(res.totalItems);
          updatePageView(res.items, pageNum);
          fetchPromise = undefined;
          return res;
        },
        res => {
          fetchPromise = undefined;
          return res;
        }
      );
    } else {
      updatePageView(cachedPage, pageNum);
    }
  }
  export const buttonAction: Action<HTMLButtonElement, { curPage: number; btnPage: number }> = (btn, param) => {
    function updateCurrent({ curPage, btnPage }: { curPage: number; btnPage: number }) {
      if (curPage === btnPage) {
        btn.classList.add('current');
        btn.disabled = true;
      } else {
        btn.classList.remove('current');
        btn.disabled = false;
      }
    }
    updateCurrent(param);
    const clickListener = () => setPage(param.btnPage);
    btn.addEventListener('click', clickListener);
    return {
      update(param) {
        updateCurrent(param);
      },
      destroy() {
        btn.removeEventListener('click', clickListener);
      }
    };
  };

  setPage(initialPageNum);
</script>

<div class="pl-root">
  <ul>
    {#if page.state === 'empty'}
      <slot name="empty" />
    {:else if page.state === 'loading'}
      <slot name="loading" />
    {:else if page.state === 'list'}
      {#each page.items as item, index}
        <slot name="item" {item} {index} />
      {/each}
    {/if}
  </ul>
  {#if getPageCount() > 1}
    <div class="separator" />
    <div class="bottom-section">
      <div class="page-selection">
        {#each { length: getPageCount() } as _, i}
          <button class="page-btn" use:buttonAction={{ btnPage: i + 1, curPage: curPageNum }}>{i + 1}</button>
        {/each}
      </div>
      <span class="status">
        {#if page.state === 'loading'}
          {m.cPagedListLoading()}
        {:else if page.state === 'list'}
          {m.cPagedListItemsStatus({ first: page.first, last: page.last, total: totalItems })}
        {/if}
      </span>
    </div>
  {/if}
</div>

<style lang="scss">
  @use '$lib/styles/common';
  @use '$lib/styles/colors';

  .pl-root {
    margin: 10px;
    border: 2px solid var(--col-secondary-border, colors.$light-secondary-border);
    border-radius: 5px;
    padding: 0;
    background-color: var(--col-secondary-bg, colors.$light-secondary-bg);
    @include colors.col-trans($bg: true, $fg: false, $br: true);
    ul {
      list-style: none;
      padding-left: 0;
      margin: 0;
      // padding: 3px 4px;
      display: flex;
      flex-direction: column;
      flex-wrap: nowrap;
      align-items: flex-start;
    }
    .separator {
      width: 100%;
      height: 2px;
      background-color: var(--col-secondary-border, colors.$light-secondary-border);
    }
    .bottom-section {
      display: flex;
      flex-direction: row;
      flex-wrap: nowrap;
      justify-content: space-between;
      align-items: center;
      padding: 3px;
      gap: 5px;
      .page-selection {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-start;
        align-items: stretch;
        gap: 2px;
        .page-btn {
          background: none;
          color: inherit;
          border: 1px solid var(--col-secondary-border, colors.$light-secondary-border);
          border-radius: 4px;
          cursor: pointer;
          font: inherit;
          // for some strange reason "&.current {}" rule doesn't compile
          &:is(.current) {
            background-color: color-mix(in srgb, var(--col-fg, colors.$light-text) 20%, transparent);
            cursor: default;
          }
        }
      }
      // .status {}
    }
  }
</style>
