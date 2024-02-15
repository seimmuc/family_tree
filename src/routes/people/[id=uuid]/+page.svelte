<script lang="ts">
	import { clearEmptyVals, clearKeys } from '$lib/utils';

  export let data;
</script>

<h1>{data.person.firstName}</h1>
<h2>{data.person.lastName}</h2>
<div>{JSON.stringify(clearKeys(clearEmptyVals(data.person), ['id', 'firstName', 'lastName']))}</div>
<!-- <p>Relations:</p> -->
<!-- <div style="white-space: pre; font-family: monospace;">{JSON.stringify(data.relations, undefined, 2)}</div> -->
