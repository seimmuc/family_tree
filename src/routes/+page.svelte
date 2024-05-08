<script lang="ts">
  import * as m from '$lib/paraglide/messages.js';
  export let data;
</script>

<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://kit.svelte.dev">kit.svelte.dev</a> to read the documentation</p>

<p>{m.hello()}</p>
{#if data.user}
  <p>{m.hi({ name: data.user.username })}</p>
  <p>Signed in as {data.user.username}</p>
  <p>{JSON.stringify(data.user)}</p>
{:else}
  <p>Not signed in</p>
{/if}
