<script lang="ts">
  import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
  import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
  import { formatDate } from '$lib/client/clutils.js';

  export let data;
  $: person = data.person;
</script>

<div class="main-area">
  <h1>{person.name}</h1>
  <h3 class="date-display">{formatDate(person.birthDate, 'birth')} - {formatDate(person.deathDate, 'death')}</h3>
  <p>{person.bio}</p>
</div>

<a class="back-button" href="/tree/{person.id}">
  <FontAwesomeIcon icon={faArrowLeft} size="3x" />
</a>

<style>
  .main-area {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  p {
    max-width: 1000px;
    margin: 0 20px;
    /* overflow: hidden; */
    text-align: center;
    word-wrap: break-word;
  }

  .back-button {
    color: black;
    position: absolute;
    top: 50px;
    left: 100px;
  }
</style>
