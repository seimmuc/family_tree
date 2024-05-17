<div class="root">
  <div class="main-area">
    <slot />
  </div>
</div>

<style lang="scss">
  @use '$lib/styles/colors';

  .root {
    display: flex;
    flex-direction: column;
    margin: 30px 15px;
    align-items: center;
    .main-area {
      width: 94%;
      max-width: 900px;
      display: flex;
      flex-direction: column;
      align-items: center;
      background-color: var(--col-primary-bg, colors.$light-primary-bg);
      border: 3px solid var(--col-primary-border, colors.$light-primary-border);
      border-radius: 16px;
      @include colors.col-trans($bg: true, $fg: false, $br: true);
      padding: 10px 20px;
    }
  }
</style>
