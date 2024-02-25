<script lang="ts">
  export let data;
</script>

<ul>
  {#each data.people as person}
    <li>{person.name} ({person.gender}) was born on "{person.birthDate} [<a href="/tree/people/{person.id}" data-sveltekit-preload-data="off">{person.id}</a>]"</li>
  {/each}
</ul>