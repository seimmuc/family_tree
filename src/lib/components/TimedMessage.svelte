<script lang="ts">
  export let duration = 8000;

  let show = false;
  let msg = '';
  let timeout: NodeJS.Timeout | undefined = undefined;

  export function setMessage(message: string | undefined) {
    hide();
    msg = message ?? '';
    show = true;
    timeout = setTimeout(hide, duration);
  }
  function hide() {
    show = false;
    if (timeout !== undefined) {
      clearTimeout(timeout);
      timeout = undefined;
    }
  }
  export function isShown(): boolean {
    return show;
  }
</script>

{#if show}
  <slot {msg}>
    <span>{msg}</span>
  </slot>
{/if}
