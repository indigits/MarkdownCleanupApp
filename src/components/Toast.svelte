<script lang="ts">
  export let message: string = '';
  export let visible: boolean = false;
</script>

{#if visible}
  <div class="toast-container">
    <div class="toast" role="status" aria-live="polite">
      <div class="toast-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </div>
      <span>{message}</span>
    </div>
  </div>
{/if}
