<script lang="ts">
  import { FontAwesomeIcon } from "@fortawesome/svelte-fontawesome";
  import { faArrowLeft } from "@fortawesome/free-solid-svg-icons";

  export let data;
  $: person = data.person;

  const dateFormatOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }
</script>

<div class ="main-area">
  <h1>{person.name}</h1>
  <h3>{(new Date(person.birthDate ?? '')).toLocaleDateString(undefined, dateFormatOptions)} - {(new Date(person.deathDate ?? '')).toLocaleDateString(undefined, dateFormatOptions)}</h3>

  <p>{person.bio}</p>
</div>

<a class="back-button" href="/tree/{person.id}">
  <FontAwesomeIcon icon={faArrowLeft} size="3x"/>
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