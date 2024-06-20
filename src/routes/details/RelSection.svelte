<script lang="ts">
  import SearchBox, { type SearchCache, type SelectionEventDetail } from '$lib/components/SearchBox.svelte';
  import type { Person } from '$lib/types/person';
  import { faCircleXmark } from '@fortawesome/free-regular-svg-icons';
  import { faPlus } from '@fortawesome/free-solid-svg-icons';
  import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
  import { createEventDispatcher, tick } from 'svelte';
  import { slide } from 'svelte/transition';
  import * as m from '$lib/paraglide/messages.js';

  export let editMode: boolean;
  export let sectionName: string;
  export let people: Person[];

  const dispatch = createEventDispatcher();
  const searchCache: SearchCache = [];
  let aSB: SearchBox | undefined;
  let addingPerson: boolean = false;
  let peopleEditList: Person[];

  function updatePeople(newPeople: Person[]) {
    peopleEditList = [...newPeople];
  }
  $: updatePeople(people);

  function updateEditMode(newVal: boolean) {
    if (!newVal) {
      addingPerson = false;
    }
  }
  $: updateEditMode(editMode);

  export function differences(): { added: Person[]; removed: Person[] } {
    const os = new Set(people.map(p => p.id));
    const ns = new Set(peopleEditList.map(p => p.id));
    return {
      added: peopleEditList.filter(p => !os.has(p.id)),
      removed: people.filter(p => !ns.has(p.id))
    };
  }

  function onNameClick(e: MouseEvent & { currentTarget: EventTarget & HTMLAnchorElement }, person: Person) {
    if (!editMode) {
      const allow = dispatch('navigation', { person, url: e.currentTarget.href }, { cancelable: true });
      if (!allow) {
        e.preventDefault();
      }
    }
  }
  async function toggleAddingPerson() {
    addingPerson = !addingPerson;
    if (addingPerson) {
      await tick();
      aSB?.getInputElement()?.focus();
    }
  }
  function addPerson(e: CustomEvent<SelectionEventDetail>) {
    const person = e.detail.person;
    if (!peopleEditList.some(p => p.id === person.id)) {
      peopleEditList.push(person);
      peopleEditList = peopleEditList;
    } else {
      e.preventDefault();
    }
  }
  function removePerson(person: Person) {
    peopleEditList = peopleEditList.filter(p => p.id !== person.id);
  }

  $: sectionClass = sectionName.toLowerCase().replaceAll(' ', '-');
</script>

<div class="rel-section {sectionClass}">
  <h1 class="rel-header">{sectionName}</h1>
  <ul>
    {#each editMode ? peopleEditList : people as p (p.id)}
      <li>
        <a href={editMode ? '' : `/details/${p.id}`} on:click={e => onNameClick(e, p)}>{p.name}</a>
        {#if editMode}
          <button
            type="button"
            transition:slide={{ duration: 400, axis: 'x' }}
            class="remove-button"
            on:click={() => removePerson(p)}
          >
            <FontAwesomeIcon icon={faCircleXmark} />
          </button>
        {/if}
      </li>
    {/each}
    {#if editMode}
      <div transition:slide={{ duration: 400, axis: 'y' }} class="add-person">
        {#if addingPerson}
          <div transition:slide={{ duration: 400, axis: 'x' }} class="search-wrapper">
            <SearchBox
              canHide={false}
              enableXButton={false}
              {searchCache}
              inputBoxStyle="width: 10em;"
              on:selection={addPerson}
              bind:this={aSB}
            />
          </div>
        {/if}
        <button type="button" class="toggle-sb" class:x={addingPerson} title={addingPerson ? m.cSearchBoxBtnClose() : m.cSearchBoxBtnSearch()} on:click={toggleAddingPerson}>
          <FontAwesomeIcon icon={faPlus} />
        </button>
      </div>
    {/if}
  </ul>
</div>

<style lang="scss">
  @use '$lib/styles/common';
  @use '$lib/styles/colors';

  @mixin lnk-btn {
    color: var(--col-link-normal, colors.$light-link-normal);
    @include colors.col-trans($bg: false, $fg: true, $br: false);
    &:hover {
      color: var(--col-link-hover, colors.$light-link-hover);
    }
  }

  .rel-section {
    .rel-header {
      margin: 0;
      margin-bottom: 0.5em;
      @include colors.col-trans($bg: false, $fg: true, $br: false);
    }
    ul {
      list-style: none;
      min-width: 11em;
      padding: 0;
      margin: 0;
      margin-bottom: 15px;
      li {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        justify-content: flex-start;
        align-items: center;
        gap: 0.5em;
        &:not(:last-of-type) {
          margin-bottom: 0.4em;
        }
        a {
          @include common.link;
          user-select: none;
        }
        .remove-button {
          @include common.styleless-button;
          font-size: 0.9em;
          padding: 0.05em 0.2em;
          @include lnk-btn;
        }
      }
      .add-person {
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        align-items: center;
        justify-content: flex-start;
        padding-top: 5px;
        .search-wrapper {
          font-size: 0.65em;
        }
        .toggle-sb {
          @include common.styleless-button;
          @include lnk-btn;
          padding: 0.1em 6px;
          &:first-child {
            padding-left: 1px;
          }
          :global(svg) {
            transition: transform 0.4s;
          }
          &.x :global(svg) {
            transform: rotate(45deg);
          }
        }
      }
    }
  }
</style>
