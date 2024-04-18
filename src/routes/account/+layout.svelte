<div class="aroot">
  <slot />
</div>

<style lang="scss">
  @use '$lib/styles/colors';

  .aroot {
    --account-hpad: 15px;
    margin: 15px calc(3.75% + 1px);
    border: 3px solid var(--col-primary-border, colors.$light-primary-border);
    border-radius: 8px;
    padding: 10px var(--account-hpad);
    background-color: var(--col-primary-bg, colors.$light-primary-bg);
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    @include colors.col-trans($bg: true, $fg: false, $br: true);
  }
</style>
