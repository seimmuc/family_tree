<script lang="ts">
  import PersonInfo from '$lib/components/PersonInfo.svelte';
  import TimedMessage from '$lib/components/TimedMessage.svelte';
  import DetailsMainArea from '../DetailsMainArea.svelte';
  import * as m from '$lib/paraglide/messages.js';
  import { slide } from 'svelte/transition';
  import { TRANS_DELAY, type PersonChanges } from '$lib/client/clutils';
  import { quadOut } from 'svelte/easing';
  import { enhance } from '$app/forms';
  import type { SubmitFunction } from './$types.js';
  import { clearEmptyVals, type ExcludeVals } from '$lib/utils';
  import type { PersonData } from '$lib/types/person';
  import SearchBox, { type SearchBoxLinkFunc } from '$lib/components/SearchBox.svelte';
  import RelSection from '../RelSection.svelte';
  import { createRelChangeRequest } from '../utils';

  export let data;

  let piComp: PersonInfo;
  let frm: HTMLFormElement;
  let formMsg: TimedMessage;
  const rels = {
    parentsComp: undefined as any as RelSection,
    childrenComp: undefined as any as RelSection,
    partnersComp: undefined as any as RelSection
  };

  const submit: SubmitFunction = ({ formData, cancel }) => {
    // person data
    const pdRes = piComp.getChanges();
    if (pdRes.isErr()) {
      formMsg.setMessage(pdRes.error);
      return cancel();
    }
    type PDType = ExcludeVals<PersonChanges, null | undefined> & Required<Pick<PersonChanges, 'name'>>;
    const personData: PersonData = clearEmptyVals(pdRes.value) as PDType;
    formData.append('person-new', JSON.stringify(personData));

    // relatives
    const relsUpd = createRelChangeRequest([
      ['parents', rels.parentsComp],
      ['children', rels.childrenComp],
      ['partners', rels.partnersComp]
    ]);
    formData.append('relatives-new', JSON.stringify(relsUpd));

    return async ({ result, update }) => {
      formMsg.hide();
      if (result.type === 'failure' && result.data?.message) {
        formMsg.setMessage(result.data.message);
      }
      update();
    };
  };

  data.dynamicMenu.set({
    comp: SearchBox,
    compProps: { linkFunc: (p => `/details/${p.id}`) satisfies SearchBoxLinkFunc }
  });
</script>

<DetailsMainArea>
  <h1>{m.newPersonHeader()}</h1>
  <PersonInfo editMode={true} person={{ name: '' }} on:returnkey={() => frm?.requestSubmit()} bind:this={piComp} />
  <TimedMessage bind:this={formMsg} let:msg>
    <p class="form-message" transition:slide={{ axis: 'y', duration: TRANS_DELAY, easing: quadOut }}>{msg}</p>
  </TimedMessage>
  <div class="relations">
    <RelSection editMode={true} sectionName="Parents" people={[]} bind:this={rels.parentsComp} />
    <RelSection editMode={true} sectionName="Children" people={[]} bind:this={rels.childrenComp} />
    <RelSection editMode={true} sectionName="Partners" people={[]} bind:this={rels.partnersComp} />
  </div>
  <div class="form-buttons">
    <form method="POST" enctype="multipart/form-data" use:enhance={submit} bind:this={frm}>
      <button type="submit">Add</button>
    </form>
    <button type="button" disabled on:click={() => formMsg.setMessage('not implemented yet')}>Cancel</button>
  </div>
</DetailsMainArea>

<style lang="scss">
  h1 {
    margin: 0.5em 0;
  }
  form {
    display: contents;
  }
  .form-message {
    margin: 1px 0 5px;
    color: red;
  }
  .relations {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    justify-content: space-evenly;
    align-items: flex-start;
    gap: 20px;
    width: 100%;
    margin-top: 15px;
  }
</style>
