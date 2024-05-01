<script lang="ts">
  import { PUBLIC_EVERYTHING } from '$env/static/public';
  import * as m from '$lib/paraglide/messages.js';
  export let data;
</script>

<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://kit.svelte.dev">kit.svelte.dev</a> to read the documentation</p>

<p>Everything is {PUBLIC_EVERYTHING}</p>
<p>{m.hello()}</p>
{#if data.user}
  <p>{m.hi({ name: data.user.username })}</p>
  <p>Signed in as {data.user.username}</p>
  <p>{JSON.stringify(data.user)}</p>
{:else}
  <p>Not signed in</p>
{/if}
