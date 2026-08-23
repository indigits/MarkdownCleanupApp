<script lang="ts">
  import { parseMarkdownToHtml } from '../lib/parser';

  export let markdown: string = '';

  $: renderedHtml = parseMarkdownToHtml(markdown);
</script>

<div class="preview-wrapper">
  {#if !markdown.trim()}
    <div class="obsidian-empty-state">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--accent); opacity: 0.7;">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <polyline points="10 9 9 9 8 9"></polyline>
      </svg>
      <p>Cleaned Obsidian reading view will appear here</p>
    </div>
  {:else}
    <div class="preview-content">
      {@html renderedHtml}
    </div>
  {/if}
</div>
