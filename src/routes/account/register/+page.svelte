<script lang="ts">
  import { enhance } from '$app/forms';

  export let data;
</script>

<h1>Register</h1>
<div>
  <form method="POST" use:enhance>
    {#if data.redirectTo}
      <input type="hidden" name="redir" value={data.redirectTo} />
    {/if}
    <label>Username<input name="username" type="text" /></label>
    <label>Password<input name="password" type="password" /></label>
    <button type="submit">Register</button>
  </form>
</div>
