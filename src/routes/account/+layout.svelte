<script lang="ts">
  import RootDiv from '$lib/components/RootDiv.svelte';
  import Navbar from '$lib/components/Navbar.svelte';
  import type { SearchBoxLinkFunc } from '$lib/components/SearchBox.svelte';
  
  export let data;

  data.dynamicMenu.set({
    comp: Navbar,
    compProps: { enableAddPerson: false, enableSearchBox: true, searchBoxLinkFunc: (p => `/tree/${p.id}`) satisfies SearchBoxLinkFunc }
  });
</script>

<RootDiv>
  <slot />
</RootDiv>
