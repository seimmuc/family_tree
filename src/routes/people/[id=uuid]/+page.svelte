<script lang="ts">
	import { clearEmptyVals, clearKeys } from '$lib/utils';

  export let data;
</script>

<h1>{data.person.name}</h1>
<div>{JSON.stringify(clearKeys(clearEmptyVals(data.person), ['id', 'name', 'lastName']))}</div>
